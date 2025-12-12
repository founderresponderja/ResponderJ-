import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  User, 
  Search, 
  AlertTriangle, 
  Users, 
  UserMinus,
  Check,
  X,
  Loader2
} from 'lucide-react';

// Mock types
interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: string;
}

// Mock Data
const MOCK_USERS_ROLES: AdminUser[] = [
  { id: 1, firstName: "Luís", lastName: "Pedrosa", email: "lfpedrosa@gmail.com", isAdmin: true, isSuperAdmin: true, isActive: true, lastLoginAt: "2025-01-20T10:00:00Z" },
  { id: 2, firstName: "Maria", lastName: "Santos", email: "maria.admin@responderja.pt", isAdmin: true, isSuperAdmin: false, isActive: true, lastLoginAt: "2025-01-19T15:30:00Z" },
  { id: 3, firstName: "João", lastName: "Silva", email: "joao.silva@empresa.com", isAdmin: false, isSuperAdmin: false, isActive: true, lastLoginAt: "2025-01-18T09:15:00Z" },
  { id: 4, firstName: "Ana", lastName: "Costa", email: "ana.costa@tech.pt", isAdmin: false, isSuperAdmin: false, isActive: true, lastLoginAt: "2025-01-15T14:20:00Z" },
  { id: 5, firstName: "Pedro", lastName: "Oliveira", email: "pedro.admin@responderja.pt", isAdmin: true, isSuperAdmin: false, isActive: false, lastLoginAt: "2024-12-20T11:45:00Z" }
];

type ActionType = 'promote_admin' | 'demote_admin' | 'promote_super' | 'demote_super' | null;

const AdminRolesManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS_ROLES);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats
  const stats = {
    totalUsers: users.length,
    admins: users.filter(u => u.isAdmin && !u.isSuperAdmin).length,
    superAdmins: users.filter(u => u.isSuperAdmin).length,
    regularUsers: users.filter(u => !u.isAdmin && !u.isSuperAdmin).length
  };

  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(search.toLowerCase()) || 
    user.lastName.toLowerCase().includes(search.toLowerCase()) || 
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleActionClick = (user: AdminUser, action: ActionType) => {
    setSelectedUser(user);
    setActionType(action);
    setIsModalOpen(true);
    setConfirmPassword("");
    setReason("");
  };

  const getActionTitle = () => {
    if (!selectedUser || !actionType) return "";
    switch (actionType) {
      case 'promote_admin': return `Promover ${selectedUser.firstName} a Administrador`;
      case 'demote_admin': return `Remover Admin de ${selectedUser.firstName}`;
      case 'promote_super': return `Promover ${selectedUser.firstName} a Super Admin`;
      case 'demote_super': return `Remover Super Admin de ${selectedUser.firstName}`;
      default: return "";
    }
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType) return;

    setIsProcessing(true);

    // Simulate API call
    setTimeout(() => {
      setUsers(users.map(u => {
        if (u.id === selectedUser.id) {
          let updates = {};
          switch (actionType) {
            case 'promote_admin': updates = { isAdmin: true }; break;
            case 'demote_admin': updates = { isAdmin: false }; break;
            case 'promote_super': updates = { isSuperAdmin: true, isAdmin: true }; break;
            case 'demote_super': updates = { isSuperAdmin: false }; break;
          }
          return { ...u, ...updates };
        }
        return u;
      }));
      
      setIsProcessing(false);
      setIsModalOpen(false);
      setSelectedUser(null);
      setActionType(null);
    }, 1000);
  };

  const renderRoleBadge = (user: AdminUser) => {
    if (user.isSuperAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <ShieldCheck className="w-3 h-3" /> Super Admin
        </span>
      );
    }
    if (user.isAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          <UserCheck className="w-3 h-3" /> Administrador
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
        <User className="w-3 h-3" /> Utilizador
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestão de Administradores</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Gerir roles e permissões de acesso ao sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Utilizadores</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Utilizadores Regulares</span>
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.regularUsers}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Administradores</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.admins}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Super Admins</span>
            <ShieldCheck className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.superAdmins}</p>
        </div>
      </div>

      {/* Search & List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text"
              placeholder="Pesquisar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role Atual</th>
                <th className="px-6 py-4">Último Login</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    {renderRoleBadge(user)}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('pt-PT') : "Nunca"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {!user.isAdmin && (
                        <button 
                          onClick={() => handleActionClick(user, 'promote_admin')}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-900/50 transition-colors"
                          title="Promover a Admin"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      
                      {user.isAdmin && !user.isSuperAdmin && (
                        <>
                          <button 
                            onClick={() => handleActionClick(user, 'demote_admin')}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-900/50 transition-colors"
                            title="Remover Admin"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleActionClick(user, 'promote_super')}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-200 dark:border-red-900/50 transition-colors"
                            title="Promover a Super Admin"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {user.isSuperAdmin && (
                        <button 
                          onClick={() => handleActionClick(user, 'demote_super')}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                          title="Remover Super Admin"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirmar Alteração de Role</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleConfirmAction} className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 mb-4">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{getActionTitle()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirmar Password (Super Admin)
                </label>
                <input 
                  type="password"
                  required
                  placeholder="Introduzir password de super admin"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Justificação
                </label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Motivo da alteração de role..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border resize-none"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mínimo 10 caracteres.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isProcessing || reason.length < 10 || !confirmPassword}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      A processar...
                    </>
                  ) : (
                    <>
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRolesManagement;