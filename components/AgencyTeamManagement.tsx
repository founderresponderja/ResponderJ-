
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldAlert,
  Clock, 
  CheckCircle2, 
  X, 
  MoreVertical, 
  Mail,
  Loader2,
  Trash2,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';

interface AgencyMember {
  id: string;
  userId: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'suspended';
  joinedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string;
  };
  email?: string; // For pending invites
}

interface AdminDelegation {
  id: string;
  delegatedTo: string; // User ID
  type: 'temporary' | 'permanent';
  startDate: string;
  endDate?: string;
  status: 'active' | 'expired';
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const AgencyTeamManagement: React.FC = () => {
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [delegations, setDelegations] = useState<AdminDelegation[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  
  const [delegateMemberId, setDelegateMemberId] = useState('');
  const [delegateType, setDelegateType] = useState<'temporary' | 'permanent'>('temporary');
  const [delegateDays, setDelegateDays] = useState('7');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAgencyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, delegationsRes] = await Promise.all([
        fetch('/api/agency/members'),
        fetch('/api/agency/delegations')
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      } else {
        // Fallback or handle error (e.g. not authorized)
        console.error('Failed to fetch members');
      }

      if (delegationsRes.ok) {
        const delegationsData = await delegationsRes.json();
        setDelegations(delegationsData);
      }
    } catch (e) {
      console.error(e);
      setError("Erro ao carregar dados da agência");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencyData();
  }, []);

  const stats = {
    activeMembers: members.filter(m => m.status === 'active').length,
    pendingInvites: members.filter(m => m.status === 'pending').length,
    activeDelegations: delegations.filter(d => d.status === 'active').length
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/agency/invite-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erro ao convidar membro");
      }

      await fetchAgencyData();
      setIsInviteModalOpen(false);
      setInviteEmail('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find(m => m.userId === delegateMemberId);
    if (!member) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/agency/delegate-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: delegateMemberId, 
          type: delegateType, 
          days: delegateType === 'temporary' ? delegateDays : null 
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erro ao delegar admin");
      }

      await fetchAgencyData();
      setIsDelegateModalOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertTriangle className="w-8 h-8 mb-2" />
        <p>{error}</p>
        <button onClick={fetchAgencyData} className="mt-4 text-brand-600 hover:underline">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Equipas</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerir membros e administração da agência (Máximo: 5 utilizadores)</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsDelegateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Shield className="w-4 h-4" /> Delegar Admin
          </button>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            disabled={members.length >= 5}
          >
            <UserPlus className="w-4 h-4" /> Convidar Membro
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Membros Activos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeMembers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Convites Pendentes</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pendingInvites}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Delegações Activas</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeDelegations}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Membros da Agência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Ainda não tem membros na sua equipa.</p>
            ) : (
              members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={member.user?.profileImageUrl} />
                      <AvatarFallback>
                        {member.user ? member.user.firstName.substring(0, 2).toUpperCase() : 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      {member.user ? (
                        <>
                          <p className="font-medium text-slate-900 dark:text-white">{member.user.firstName} {member.user.lastName}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{member.user.email}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-slate-900 dark:text-white">Convidado</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{member.email || 'Email pendente'}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                        member.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        member.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {member.status === 'active' ? 'Activo' : member.status === 'pending' ? 'Pendente' : 'Suspenso'}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {member.role === 'admin' ? 'Administrador' : 'Membro'}
                      </span>
                    </div>
                    {/* Only show edit for real members, not pending invites if no user data yet */}
                    {member.user && (
                      <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delegations List */}
      {delegations.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Delegações de Administração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {delegations.map(delegation => (
                <div key={delegation.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {delegation.user ? `${delegation.user.firstName} ${delegation.user.lastName}` : 'Utilizador'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {delegation.type === 'permanent' ? 'Definitiva' : 'Temporária'} 
                        {delegation.endDate && ` • Até ${new Date(delegation.endDate).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                    delegation.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {delegation.status === 'active' ? 'Ativa' : 'Expirada'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Convidar Membro</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="membro@exemplo.com"
                />
                <p className="text-xs text-slate-500 mt-1">O novo membro receberá um convite por email.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Função</label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail size={16} />} 
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delegate Modal */}
      {isDelegateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Delegar Administração</h3>
              <button onClick={() => setIsDelegateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDelegate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Membro</label>
                <select 
                  value={delegateMemberId}
                  onChange={(e) => setDelegateMemberId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="">Seleccionar membro</option>
                  {members.filter(m => m.status === 'active' && m.user).map(m => (
                    <option key={m.id} value={m.userId}>{m.user?.firstName} {m.user?.lastName} ({m.user?.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Delegação</label>
                <select 
                  value={delegateType}
                  onChange={(e) => setDelegateType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="temporary">Temporária</option>
                  <option value="permanent">Definitiva</option>
                </select>
              </div>
              {delegateType === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duração (dias)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="365"
                    value={delegateDays}
                    onChange={(e) => setDelegateDays(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsDelegateModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} 
                  Delegar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyTeamManagement;
