// ─────────────────────────────────────────────────────────────────────────────
// MijnComfortabel 1.0 — Address migration (dry-run + apply)
//
// Steps:
//   1. Compute normalizedAddressKey for every property.
//   2. Group by key; detect duplicate groups.
//   3. Score each candidate (canonicalRecordScore) and pick a canonical winner.
//   4. Produce: merge report, conflict list, id-mapping (old → canonical).
//   5. In --apply mode: re-point child rows to the canonical record,
//      deactivate the merged duplicates, backfill normalizedAddressKey,
//      ensure an active owner propertyMember exists, then (separately) the
//      UNIQUE constraint can be applied.
//
// Usage:
//   node scripts/migrate-addresses.mjs            # dry-run (no writes)
//   node scripts/migrate-addresses.mjs --apply    # perform merge + backfill
// ─────────────────────────────────────────────────────────────────────────────

import mysql from "mysql2/promise";

const APPLY = process.argv.includes("--apply");

function normalizeAddressKey({ postalCode, houseNumber, addition, houseLetter }) {
  const pc = String(postalCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const nr = String(houseNumber ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const letter = String(houseLetter ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const addn = String(addition ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const suffix = [letter, addn].filter(Boolean).join("");
  const parts = [pc, nr];
  if (suffix) parts.push(suffix);
  return parts.join("-");
}

function computeCanonicalScore(c) {
  let score = 0;
  if (c.hasLinkedUser) score += 1000;
  score += c.inspectionCount * 50;
  score += c.maintenanceCount * 20;
  score += c.documentCount * 20;
  score += c.chatMessageCount * 5;
  score += c.filledFieldCount * 2;
  score += Math.max(0, (1_900_000_000_000 - c.createdAtMs) / 1_000_000_000);
  return score;
}

const MEANINGFUL_FIELDS = [
  "buildYear", "surfaceM2", "residents", "energyLabel", "wozValue", "purchasePrice",
  "mortgageProvider", "kadastraleAanduiding", "foundationType", "roofType", "heatingSystem",
  "glazingType", "wallInsulation", "roofInsulation", "floorInsulation", "targetEnergyLabel",
  "notes", "photoUrl",
];

function countFilledFields(row) {
  let n = 0;
  for (const f of MEANINGFUL_FIELDS) {
    const v = row[f];
    if (v !== null && v !== undefined && v !== "" && v !== "onbekend") n++;
  }
  return n;
}

/** Pick a valid user id to attribute a migration-generated changeRequest to. */
async function resolveValidator(conn, propertyId) {
  // Prefer an active member of this property.
  const [[m]] = await conn.query(
    "SELECT userId FROM propertyMembers WHERE propertyId=? AND status='active' ORDER BY id LIMIT 1",
    [propertyId]
  );
  if (m && m.userId != null) return m.userId;
  // Otherwise any admin.
  const [[a]] = await conn.query("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1");
  if (a && a.id != null) return a.id;
  // Last resort: any user.
  const [[u]] = await conn.query("SELECT id FROM users ORDER BY id LIMIT 1");
  return u ? u.id : 1;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const conn = await mysql.createConnection(url);
  const log = [];
  const say = (s) => { log.push(s); console.log(s); };

  say(`# Adresmigratie ${APPLY ? "(APPLY)" : "(DRY-RUN)"} — ${new Date().toISOString()}`);

  const [props] = await conn.query("SELECT * FROM properties");
  say(`\nAantal woningen: ${props.length}`);

  // Gather child counts and linkage per property.
  const candidates = [];
  for (const p of props) {
    const [[insp]] = await conn.query("SELECT COUNT(*) AS c FROM inspections WHERE propertyId=?", [p.id]);
    const [[maint]] = await conn.query("SELECT COUNT(*) AS c FROM maintenanceIssues WHERE propertyId=?", [p.id]);
    const [[doc]] = await conn.query("SELECT COUNT(*) AS c FROM documents WHERE propertyId=?", [p.id]);
    const [[chat]] = await conn.query("SELECT COUNT(*) AS c FROM chatMessages WHERE propertyId=?", [p.id]);
    // hasLinkedUser: via customers.userId or an existing propertyMember.
    let hasLinkedUser = false;
    if (p.customerId != null) {
      const [[cu]] = await conn.query("SELECT userId FROM customers WHERE id=?", [p.customerId]);
      if (cu && cu.userId != null) hasLinkedUser = true;
    }
    const [[pm]] = await conn.query("SELECT COUNT(*) AS c FROM propertyMembers WHERE propertyId=? AND status='active'", [p.id]);
    if (pm.c > 0) hasLinkedUser = true;

    candidates.push({
      id: p.id,
      raw: p,
      key: normalizeAddressKey(p),
      hasLinkedUser,
      inspectionCount: insp.c,
      maintenanceCount: maint.c,
      documentCount: doc.c,
      chatMessageCount: chat.c,
      filledFieldCount: countFilledFields(p),
      createdAtMs: new Date(p.createdAt).getTime(),
    });
  }

  // Group by normalized key.
  const groups = new Map();
  for (const c of candidates) {
    if (!groups.has(c.key)) groups.set(c.key, []);
    groups.get(c.key).push(c);
  }

  say(`\n## Genormaliseerde sleutels`);
  for (const [key, group] of groups) {
    say(`- ${key}: ${group.map((g) => g.id).join(", ")}${group.length > 1 ? "  <-- DUPLICAAT" : ""}`);
  }

  // Build merge plan + conflict list + id-mapping.
  const idMapping = {}; // oldId -> canonicalId
  const conflicts = [];
  const mergePlan = []; // { canonicalId, mergedIds: [] }

  for (const [key, group] of groups) {
    if (group.length <= 1) {
      if (group[0]) idMapping[group[0].id] = group[0].id;
      continue;
    }
    // Score and pick canonical.
    let best = group[0];
    let bestScore = computeCanonicalScore(group[0]);
    for (const g of group.slice(1)) {
      const s = computeCanonicalScore(g);
      if (s > bestScore) { best = g; bestScore = s; }
    }
    const merged = group.filter((g) => g.id !== best.id).map((g) => g.id);
    mergePlan.push({ key, canonicalId: best.id, mergedIds: merged });
    for (const g of group) idMapping[g.id] = best.id;

    say(`\n## Merge-groep ${key}`);
    say(`Canoniek record: #${best.id} (score ${bestScore.toFixed(1)}, linkedUser=${best.hasLinkedUser}, insp=${best.inspectionCount}, doc=${best.documentCount}, velden=${best.filledFieldCount})`);
    for (const g of group) {
      if (g.id === best.id) continue;
      say(`  - samenvoegen #${g.id} (score ${computeCanonicalScore(g).toFixed(1)}, linkedUser=${g.hasLinkedUser}, insp=${g.inspectionCount}, doc=${g.documentCount}, velden=${g.filledFieldCount})`);
      // Conflict detection: differing non-null meaningful field values.
      for (const f of MEANINGFUL_FIELDS) {
        const a = best.raw[f];
        const b = g.raw[f];
        const an = a !== null && a !== undefined && a !== "" && a !== "onbekend";
        const bn = b !== null && b !== undefined && b !== "" && b !== "onbekend";
        if (an && bn && String(a) !== String(b)) {
          conflicts.push({ key, field: f, canonical: { id: best.id, value: a }, merged: { id: g.id, value: b } });
        }
      }
    }
  }

  say(`\n## Conflictenlijst (${conflicts.length})`);
  if (conflicts.length === 0) say("Geen veldconflicten gedetecteerd.");
  for (const c of conflicts) {
    say(`- ${c.key} veld '${c.field}': canoniek #${c.canonical.id}='${c.canonical.value}' vs #${c.merged.id}='${c.merged.value}' (canoniek wint)`);
  }

  say(`\n## ID-mapping (oud -> canoniek)`);
  for (const [oldId, canon] of Object.entries(idMapping)) {
    say(`- ${oldId} -> ${canon}${Number(oldId) !== canon ? "  (samengevoegd)" : ""}`);
  }

  if (!APPLY) {
    say(`\n## ROLLBACK-PLAN`);
    say(`Deze dry-run schrijft niets. Bij --apply:`);
    say(`  1. Voor elke merge: child-rijen (inspections, maintenanceIssues, maintenancePlanning, documents, chatMessages, aiChatUsage) ge-UPDATE naar canonicalId.`);
    say(`  2. Gemergede properties: isActive=0, status='aandacht', normalizedAddressKey=NULL (om UNIQUE-conflict te vermijden).`);
    say(`  3. Canoniek record: normalizedAddressKey gevuld; actieve owner-propertyMember aangemaakt indien afwezig.`);
    say(`  Rollback: zet isActive=1 terug, herstel normalizedAddressKey, en zet child-rijen terug volgens de bewaarde id-mapping (dit rapport).`);
    await conn.end();
    return;
  }

  // ── APPLY ──────────────────────────────────────────────────────────────────
  say(`\n## TOEPASSEN`);
  await conn.beginTransaction();
  try {
    const childTables = [
      "inspections", "maintenanceIssues", "maintenancePlanning",
      "documents", "chatMessages", "aiChatUsage",
    ];
    for (const plan of mergePlan) {
      for (const oldId of plan.mergedIds) {
        for (const tbl of childTables) {
          const [r] = await conn.query(`UPDATE ${tbl} SET propertyId=? WHERE propertyId=?`, [plan.canonicalId, oldId]);
          if (r.affectedRows > 0) say(`  ${tbl}: #${oldId} -> #${plan.canonicalId} (${r.affectedRows} rijen)`);
        }
        // Re-point any propertyMembers of the merged record to canonical (avoid dup active owner).
        await conn.query(
          `UPDATE propertyMembers SET propertyId=? WHERE propertyId=?`,
          [plan.canonicalId, oldId]
        );
        // Deactivate merged duplicate, clear its key.
        await conn.query(
          `UPDATE properties SET isActive=0, status='aandacht', normalizedAddressKey=NULL WHERE id=?`,
          [oldId]
        );
        say(`  property #${oldId} gedeactiveerd (samengevoegd in #${plan.canonicalId})`);
      }
    }

    // Backfill normalizedAddressKey for all ACTIVE properties.
    for (const c of candidates) {
      if (idMapping[c.id] !== c.id) continue; // skip merged-away
      await conn.query("UPDATE properties SET normalizedAddressKey=? WHERE id=?", [c.key, c.id]);
    }
    say(`  normalizedAddressKey gevuld voor actieve records.`);

    // Handle field conflicts: NEVER silently overwrite. User input must be
    // verified. For every conflict on a canonical record we (a) flag the
    // passport for attention, (b) record both values in auditLog, and
    // (c) open a category-A changeRequest so staff validates against BAG / 0-meting.
    const conflictByCanon = new Map();
    for (const cf of conflicts) {
      const canonId = idMapping[cf.canonical.id];
      if (!conflictByCanon.has(canonId)) conflictByCanon.set(canonId, []);
      conflictByCanon.get(canonId).push(cf);
    }
    for (const [canonId, list] of conflictByCanon) {
      await conn.query(
        "UPDATE properties SET status='aandacht', addressValidationStatus='conflict' WHERE id=?",
        [canonId]
      );
      for (const cf of list) {
        // auditLog entry preserving both values.
        await conn.query(
          "INSERT INTO auditLog (actorUserId, action, entityType, entityId, previousValue, newValue) VALUES (?,?,?,?,?,?)",
          [
            null,
            "migration.conflict",
            "property",
            canonId,
            JSON.stringify({ id: cf.merged.id, [cf.field]: cf.merged.value }),
            JSON.stringify({ id: cf.canonical.id, [cf.field]: cf.canonical.value }),
          ]
        );
        // changeRequest for staff validation (category A = system/official data).
        await conn.query(
          "INSERT INTO changeRequests (propertyId, requestedBy, fieldCategory, fieldName, currentValue, proposedValue, note, status) VALUES (?,?,?,?,?,?,?, 'open')",
          [
            canonId,
            // requestedBy must be a valid user; use the canonical owner if any, else any admin.
            await resolveValidator(conn, canonId),
            "A",
            cf.field,
            String(cf.canonical.value),
            String(cf.merged.value),
            `Conflict bij merge ${cf.key}: waarde verschilde tussen samengevoegde records (#${cf.canonical.id} vs #${cf.merged.id}). Controleer tegen BAG of 0-meting.`,
          ]
        );
        say(`  conflict gemarkeerd + changeRequest aangemaakt: property #${canonId} veld '${cf.field}'`);
      }
    }

    // Ensure each active property with a linked customer.userId has an active owner member.
    const [active] = await conn.query("SELECT id, customerId FROM properties WHERE isActive=1");
    for (const p of active) {
      if (p.customerId == null) continue;
      const [[cu]] = await conn.query("SELECT userId FROM customers WHERE id=?", [p.customerId]);
      if (!cu || cu.userId == null) continue;
      const [[existing]] = await conn.query(
        "SELECT COUNT(*) AS c FROM propertyMembers WHERE propertyId=? AND userId=?",
        [p.id, cu.userId]
      );
      if (existing.c === 0) {
        await conn.query(
          "INSERT INTO propertyMembers (propertyId, userId, role, status, confirmedAt) VALUES (?,?,?,?,NOW())",
          [p.id, cu.userId, "owner", "active"]
        );
        say(`  owner-membership aangemaakt: property #${p.id} <- user #${cu.userId}`);
      }
    }

    await conn.commit();
    say(`\nCommit OK.`);
  } catch (e) {
    await conn.rollback();
    say(`\nFOUT — rollback uitgevoerd: ${e.message}`);
    await conn.end();
    process.exit(1);
  }

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
