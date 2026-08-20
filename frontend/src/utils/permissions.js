

const CAPABILITIES = {
  admin: [
    'view:ipdWard', 'create:ipdWard', 'delete:ipdWard',
    'create:ipdBed', 'delete:ipdBed', 'update:ipdBedStatus',
    'manage:staff', 'view:auditLog', 'view:billing', 'view:finance',
    'manage:department', 'manage:announcement',
    'delete:staffMessage',
  ],
  doctor: [
    'view:ipdWard',
    'admit:ipdPatient', 'transfer:ipdPatient', 'discharge:ipdPatient',
    'create:prescription',
  ],
  nurse: [
    'view:ipdWard', 'update:ipdBedStatus',
    'transfer:ipdPatient',
  ],
  receptionist: [
    'view:ipdWard', 'admit:ipdPatient',
    'bill:ipdDischarge',
    'view:billing',
  ],
  pharmacist: [
    'manage:medicine', 'create:prescriptionFulfillment',
  ],
  patient: [],
};

export function can(user, action, resource) {
  const role = user?.role;
  if (!role) return false;
  const allowed = CAPABILITIES[role];
  if (!allowed) return false;
  return allowed.includes(`${action}:${resource}`);
}

export function canAny(user, action, resource, roles) {
  if (!roles.includes(user?.role)) return false;
  return can(user, action, resource);
}
