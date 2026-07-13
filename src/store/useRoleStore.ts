import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MasterRole, RolePermissions } from '../types'
import { uid } from '../utils/helpers'
import { SEED_ROLES } from './roleSeed'

interface RoleState {
  roles: MasterRole[]
  getRole: (id: string | null | undefined) => MasterRole | undefined
  createRole: (data: Omit<MasterRole, 'id' | 'isSystem'>) => MasterRole
  updateRole: (id: string, patch: Partial<Omit<MasterRole, 'id' | 'isSystem'>>) => void
  deleteRole: (id: string) => { ok: boolean; error?: string }
  updatePermissions: (id: string, patch: Partial<RolePermissions>) => void
  ensureSystemRoles: () => void
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set, get) => ({
      roles: SEED_ROLES,
      getRole: (id) => (id ? get().roles.find((r) => r.id === id) : undefined),
      createRole: (data) => {
        const role: MasterRole = {
          ...data,
          id: uid('role'),
          isSystem: false,
        }
        set((s) => ({ roles: [...s.roles, role] }))
        return role
      },
      updateRole: (id, patch) => {
        set((s) => ({
          roles: s.roles.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...patch,
                  permissions: r.isSystem && r.id === 'super_admin' ? r.permissions : { ...r.permissions, ...(patch.permissions ?? {}) },
                }
              : r,
          ),
        }))
      },
      deleteRole: (id) => {
        const role = get().roles.find((r) => r.id === id)
        if (!role) return { ok: false, error: 'Role tidak ditemukan' }
        if (role.isSystem) return { ok: false, error: 'Role sistem tidak dapat dihapus' }
        set((s) => ({ roles: s.roles.filter((r) => r.id !== id) }))
        return { ok: true }
      },
      updatePermissions: (id, patch) => {
        set((s) => ({
          roles: s.roles.map((r) =>
            r.id === id
              ? r.isSystem && r.id === 'super_admin'
                ? r
                : { ...r, permissions: { ...r.permissions, ...patch } }
              : r,
          ),
        }))
      },
      ensureSystemRoles: () => {
        const existing = new Set(get().roles.map((r) => r.id))
        const missing = SEED_ROLES.filter((r) => !existing.has(r.id))
        const seedById = new Map(SEED_ROLES.map((r) => [r.id, r]))
        set((s) => ({
          roles: [
            // Sync name/description/color from seed for system roles (allows seed renames to propagate)
            ...s.roles.map((r) => {
              const seed = r.isSystem ? seedById.get(r.id) : undefined
              if (!seed) return r
              return { ...r, name: seed.name, description: seed.description, color: seed.color }
            }),
            ...missing,
          ],
        }))
      },
    }),
    {
      name: 'flowdesk:roles',
      onRehydrateStorage: () => (state) => {
        // Ensure new system roles are added when seed is updated
        state?.ensureSystemRoles()
      },
    },
  ),
)
