const ROLES = {
  SUPER_ADMIN:     'super_admin',
  ADMIN_DSTAC:     'admin_dstac',
  ANALISTA_DSTAC:  'analista_dstac',
  CONSULTOR_DSTAC: 'consultor_dstac',
  CLIENTE_ADMIN:   'cliente_admin',
  CLIENTE_LECTURA: 'cliente_lectura'
}

const DSTAC_ROLES = ['super_admin', 'admin_dstac', 'analista_dstac', 'consultor_dstac']
const CLIENT_ROLES = ['cliente_admin', 'cliente_lectura']

const PERMISSIONS = {
  CHANGE_THEME:       ['super_admin', 'admin_dstac', 'cliente_admin'],
  MANAGE_COMPANIES:   ['super_admin', 'admin_dstac'],
  MANAGE_USERS:       ['super_admin', 'admin_dstac', 'cliente_admin'],
  EDIT_OPERATIONAL:   ['super_admin', 'admin_dstac', 'analista_dstac'],
  VIEW_REPORTS:       ['super_admin', 'admin_dstac', 'analista_dstac', 'consultor_dstac', 'cliente_admin', 'cliente_lectura']
}

module.exports = { ROLES, DSTAC_ROLES, CLIENT_ROLES, PERMISSIONS }
