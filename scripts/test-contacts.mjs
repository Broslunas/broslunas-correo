import assert from 'node:assert/strict';

// ponytail: in-memory contact aggregation logic check without network/database
function mergeContacts({ registeredUsers, savedContacts, emails, userEmail, selfAddresses }) {
  const selfSet = new Set([userEmail, ...selfAddresses].map(a => a.toLowerCase().trim()));
  const contactMap = new Map();

  for (const u of registeredUsers) {
    const cleanEmail = u.email.trim().toLowerCase();
    if (!cleanEmail || selfSet.has(cleanEmail)) continue;
    contactMap.set(cleanEmail, {
      email: cleanEmail,
      name: u.name || cleanEmail.split('@')[0],
      source: 'registered',
      isRegistered: true,
      interactionCount: 0,
      starred: false,
    });
  }

  for (const sc of savedContacts) {
    const cleanEmail = sc.email.trim().toLowerCase();
    if (!cleanEmail || selfSet.has(cleanEmail)) continue;
    const existing = contactMap.get(cleanEmail);
    contactMap.set(cleanEmail, {
      _id: sc._id,
      email: cleanEmail,
      name: sc.name || existing?.name || cleanEmail.split('@')[0],
      source: 'saved',
      isRegistered: !!existing?.isRegistered,
      interactionCount: existing?.interactionCount || 0,
      starred: !!sc.starred,
    });
  }

  const processAddress = (addr, nameCandidate) => {
    if (!addr) return;
    const cleanEmail = addr.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || selfSet.has(cleanEmail)) return;

    const existing = contactMap.get(cleanEmail);
    if (existing) {
      existing.interactionCount += 1;
      if (!existing.name && nameCandidate) existing.name = nameCandidate;
    } else {
      contactMap.set(cleanEmail, {
        email: cleanEmail,
        name: nameCandidate || cleanEmail.split('@')[0],
        source: 'interaction',
        isRegistered: false,
        interactionCount: 1,
        starred: false,
      });
    }
  };

  for (const em of emails) {
    if (em.from?.address) processAddress(em.from.address, em.from.name);
    for (const t of em.to || []) processAddress(typeof t === 'string' ? t : t.address, t.name);
  }

  return Array.from(contactMap.values()).sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return b.interactionCount - a.interactionCount;
  });
}

// Verification assertions
const result = mergeContacts({
  registeredUsers: [
    { email: 'admin@broslunas.com', name: 'Admin Broslunas' },
    { email: 'me@broslunas.com', name: 'Yo' }
  ],
  savedContacts: [
    { _id: '1', email: 'client@externo.com', name: 'Cliente VIP', starred: true }
  ],
  emails: [
    { from: { address: 'client@externo.com' }, to: ['me@broslunas.com'] },
    { from: { address: 'lead@prospecto.com', name: 'Prospecto Nuevo' }, to: ['me@broslunas.com'] },
    { from: { address: 'lead@prospecto.com' }, to: ['me@broslunas.com'] },
    { from: { address: 'lead@prospecto.com' }, to: ['me@broslunas.com'] },
  ],
  userEmail: 'me@broslunas.com',
  selfAddresses: ['me@broslunas.com'],
});

assert.equal(result.length, 3, 'Must contain 3 contacts (registered, saved, discovered)');
assert.equal(result[0].email, 'client@externo.com', 'Starred contact must be ranked first');
assert.equal(result[0].interactionCount, 1, 'Saved contact interaction count must increment from email');
assert.equal(result[1].email, 'lead@prospecto.com', 'Highest email interaction should follow');
assert.equal(result[1].interactionCount, 3, 'Interaction count should accumulate correctly');
assert.equal(result[2].email, 'admin@broslunas.com', 'Registered user with zero interactions follows');

console.log('✓ Contacts aggregation verification passed');
