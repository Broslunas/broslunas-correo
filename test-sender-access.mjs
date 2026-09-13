import assert from 'node:assert';

// Logic check for sender authorization and mailbox resolution
function checkSenderAllowed({ assignedAddresses, cleanFrom, mailboxExists }) {
  const hasFullAccess = assignedAddresses.includes('*');

  // 1. Authorization check
  if (!hasFullAccess && !assignedAddresses.includes(cleanFrom)) {
    throw new Error(`403: No tienes permisos para enviar correos desde la cuenta: ${cleanFrom}`);
  }

  // 2. Mailbox existence check
  if (!mailboxExists && !hasFullAccess) {
    throw new Error(`400: La cuenta de correo remitente (${cleanFrom}) no está registrada en el servidor.`);
  }

  return {
    allowed: true,
    canSendWithoutAccount: !mailboxExists && hasFullAccess,
  };
}

// 1. User without full access attempting to send from unregistered mailbox throws 400
assert.throws(() => {
  checkSenderAllowed({
    assignedAddresses: ['ventas@example.com'],
    cleanFrom: 'ventas@example.com',
    mailboxExists: false,
  });
}, /400: La cuenta de correo remitente/);

// 2. User without full access attempting to send from unauthorized address throws 403
assert.throws(() => {
  checkSenderAllowed({
    assignedAddresses: ['ventas@example.com'],
    cleanFrom: 'soporte@example.com',
    mailboxExists: true,
  });
}, /403: No tienes permisos/);

// 3. User WITH full access ('*') can send from an address WITHOUT a mailbox account
const fullAccessResult = checkSenderAllowed({
  assignedAddresses: ['*'],
  cleanFrom: 'aleatorio@example.com',
  mailboxExists: false,
});
assert.strictEqual(fullAccessResult.allowed, true);
assert.strictEqual(fullAccessResult.canSendWithoutAccount, true);

// 4. User WITH full access ('*') can send from an existing mailbox account
const existingResult = checkSenderAllowed({
  assignedAddresses: ['*'],
  cleanFrom: 'admin@example.com',
  mailboxExists: true,
});
assert.strictEqual(existingResult.allowed, true);
assert.strictEqual(existingResult.canSendWithoutAccount, false);

console.log('✔ All sender access checks passed successfully!');
