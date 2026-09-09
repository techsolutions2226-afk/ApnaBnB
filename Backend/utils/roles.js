/**
 * View-hat rules for member accounts.
 * Permanent User.role is set at signup; viewRole may only be one of these.
 *   seller | buyer → seller or buyer (not dealer)
 *   dealer         → dealer only
 */
const MEMBER_VIEW_ROLES = ['seller', 'buyer', 'dealer'];

function allowedViewRoles(accountRole) {
  if (accountRole === 'dealer') return ['dealer'];
  if (accountRole === 'seller' || accountRole === 'buyer') {
    return ['seller', 'buyer'];
  }
  return [];
}

function clampViewRole(accountRole, viewRole) {
  const allowed = allowedViewRoles(accountRole);
  if (allowed.includes(viewRole)) return viewRole;
  if (allowed.includes(accountRole)) return accountRole;
  return allowed[0] || null;
}

function isAllowedViewRole(accountRole, viewRole) {
  return allowedViewRoles(accountRole).includes(viewRole);
}

function viewRoleDeniedMessage(accountRole) {
  if (accountRole === 'dealer') {
    return 'Dealers can only view as dealer.';
  }
  if (accountRole === 'seller' || accountRole === 'buyer') {
    return 'You can only view as seller or buyer.';
  }
  return 'Invalid viewRole for this account.';
}

module.exports = {
  MEMBER_VIEW_ROLES,
  allowedViewRoles,
  clampViewRole,
  isAllowedViewRole,
  viewRoleDeniedMessage,
};
