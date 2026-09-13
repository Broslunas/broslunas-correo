import assert from 'node:assert';

// Test catch-all query logic and authorization rules
function buildCatchAllQuery(userAssignedAddresses, registeredEmails, requestedFolder) {
  if (requestedFolder === 'catchall' && !userAssignedAddresses.includes('*')) {
    throw new Error('403: No autorizado para ver correos de cuentas no registradas');
  }

  const andClauses = [];
  if (requestedFolder === 'catchall') {
    const catchAllFilter = {
      folder: { $nin: ['trash', 'spam', 'sent', 'drafts', 'temp_mail'] }
    };
    if (registeredEmails.length > 0) {
      catchAllFilter.to = { $nin: registeredEmails };
      catchAllFilter.cc = { $nin: registeredEmails };
      catchAllFilter.bcc = { $nin: registeredEmails };
    }
    andClauses.push(catchAllFilter);
  }

  return { $and: andClauses };
}

// 1. Unauthorized user attempting catchall must throw
assert.throws(() => {
  buildCatchAllQuery(['specific@domain.com'], ['info@domain.com'], 'catchall');
}, /403: No autorizado/);

// 2. Authorized user with '*' can query catchall
const authorizedQuery = buildCatchAllQuery(['*'], ['info@domain.com', 'admin@domain.com'], 'catchall');
assert.deepStrictEqual(authorizedQuery, {
  $and: [
    {
      folder: { $nin: ['trash', 'spam', 'sent', 'drafts', 'temp_mail'] },
      to: { $nin: ['info@domain.com', 'admin@domain.com'] },
      cc: { $nin: ['info@domain.com', 'admin@domain.com'] },
      bcc: { $nin: ['info@domain.com', 'admin@domain.com'] }
    }
  ]
});

// 3. Authorized user with '*' when no mailboxes are registered yet
const emptyMailboxesQuery = buildCatchAllQuery(['*'], [], 'catchall');
assert.deepStrictEqual(emptyMailboxesQuery, {
  $and: [
    {
      folder: { $nin: ['trash', 'spam', 'sent', 'drafts', 'temp_mail'] }
    }
  ]
});

console.log('All catch-all check assertions passed successfully.');
