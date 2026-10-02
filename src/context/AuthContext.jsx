import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// System Roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
};

// Initial Demo Users across the 3 roles
export const DEMO_ACCOUNTS = [
  {
    id: 'usr-001',
    name: 'Elena Vance (Chief Exec)',
    email: 'superadmin@lyanswoman.com',
    role: ROLES.SUPER_ADMIN,
    title: 'Super Administrator',
    badgeColor: '#8B5CF6', // purple
    badgeBg: '#F5F3FF',
    status: 'Active',
    assignedLocation: 'All Boutiques & Depots',
    avatarInitials: 'EV',
  },
  {
    id: 'usr-002',
    name: 'Marcus Adebayo',
    email: 'admin@lyanswoman.com',
    role: ROLES.ADMIN,
    title: 'Store Operations Admin',
    badgeColor: '#1E5BF8', // royal blue
    badgeBg: '#EEF4FF',
    status: 'Active',
    assignedLocation: 'Main Store (Flagship)',
    avatarInitials: 'MA',
  },
  {
    id: 'usr-003',
    name: 'Sarah Jenkins',
    email: 'staff@lyanswoman.com',
    role: ROLES.STAFF,
    title: 'Floor Inventory Specialist',
    badgeColor: '#10B981', // green
    badgeBg: '#ECFDF5',
    status: 'Active',
    assignedLocation: 'Main Store Boutique',
    avatarInitials: 'SJ',
  },
  {
    id: 'usr-004',
    name: 'David Osei',
    email: 'david.staff@lyanswoman.com',
    role: ROLES.STAFF,
    title: 'Warehouse Stock Associate',
    badgeColor: '#10B981',
    badgeBg: '#ECFDF5',
    status: 'Active',
    assignedLocation: 'Central Warehouse',
    avatarInitials: 'DO',
  },
  {
    id: 'usr-005',
    name: 'Clara Dupont',
    email: 'clara.admin@lyanswoman.com',
    role: ROLES.ADMIN,
    title: 'Branch Inventory Manager',
    badgeColor: '#1E5BF8',
    badgeBg: '#EEF4FF',
    status: 'Deactivated',
    assignedLocation: 'Branch - North',
    avatarInitials: 'CD',
  }
];

const AuthContext = createContext(null);

export function getRoleDashboardPath(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return '/dashboard/super-admin';
    case ROLES.ADMIN:
      return '/dashboard/admin';
    case ROLES.STAFF:
      return '/dashboard/staff';
    default:
      return '/login';
  }
}

export function AuthProvider({ children }) {
  // Read persisted user or default to Super Admin for immediate rich view
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lyans_current_user');
      return saved ? JSON.parse(saved) : DEMO_ACCOUNTS[0]; // default to Super Admin
    } catch {
      return DEMO_ACCOUNTS[0];
    }
  });

  // User management state for Super Admin & Admin CRUD
  const [userDirectory, setUserDirectory] = useState(() => {
    try {
      const saved = localStorage.getItem('lyans_user_directory');
      return saved ? JSON.parse(saved) : DEMO_ACCOUNTS;
    } catch {
      return DEMO_ACCOUNTS;
    }
  });

  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('lyans_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('lyans_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('lyans_user_directory', JSON.stringify(userDirectory));
  }, [userDirectory]);

  // Login handler with role identification
  const login = async (email, password) => {
    setAuthError(null);

    // 1. Try Supabase Auth if online/configured
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!error && data?.user) {
          const userMetaRole = data.user.user_metadata?.role || ROLES.STAFF;
          const matched = userDirectory.find((u) => u.email.toLowerCase() === email.toLowerCase()) || {
            id: data.user.id,
            name: data.user.email.split('@')[0],
            email: data.user.email,
            role: userMetaRole,
            title: userMetaRole.toUpperCase(),
            status: 'Active',
            assignedLocation: 'Main Store',
            avatarInitials: data.user.email.substring(0, 2).toUpperCase(),
          };
          setCurrentUser(matched);
          return { success: true, user: matched };
        }
      } catch {
        // Fall back to local directory authentication
      }
    }

    // 2. Local directory matching for immediate testing and resilience
    const normalizedEmail = email.trim().toLowerCase();
    const foundUser = userDirectory.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!foundUser) {
      setAuthError('No active account found with that email address.');
      return { success: false, error: 'User not found.' };
    }

    if (foundUser.status === 'Deactivated') {
      setAuthError('Your account has been deactivated by an administrator.');
      return { success: false, error: 'Account deactivated.' };
    }

    setCurrentUser(foundUser);
    return { success: true, user: foundUser };
  };

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore signOut error
      }
    }
    setCurrentUser(null);
  };

  // Immediate role switcher for easy multi-role verification
  const switchDemoRole = (role) => {
    const targetUser = userDirectory.find((u) => u.role === role && u.status === 'Active');
    if (targetUser) {
      setCurrentUser(targetUser);
      return targetUser;
    }
    return null;
  };

  // User Management Actions (Enforces RBAC)
  const createUser = (newUserData, actorRole) => {
    // Admin can only create Staff
    if (actorRole === ROLES.ADMIN && newUserData.role !== ROLES.STAFF) {
      throw new Error('Admins are only permitted to create Staff accounts.');
    }
    if (actorRole === ROLES.STAFF) {
      throw new Error('Staff are not permitted to manage user accounts.');
    }

    const newUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      ...newUserData,
      status: 'Active',
      avatarInitials: newUserData.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase(),
    };

    setUserDirectory((prev) => [newUser, ...prev]);
    return newUser;
  };

  const updateUser = (userId, updates, actorRole) => {
    const target = userDirectory.find((u) => u.id === userId);
    if (!target) throw new Error('User not found.');

    // Admin cannot modify Super Admin
    if (actorRole === ROLES.ADMIN && target.role === ROLES.SUPER_ADMIN) {
      throw new Error('Forbidden: Admins have no authority to modify a Super Admin.');
    }
    // Staff cannot modify any user
    if (actorRole === ROLES.STAFF) {
      throw new Error('Forbidden: Staff cannot modify accounts.');
    }

    setUserDirectory((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );

    // If current logged in user was updated, sync
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => ({ ...prev, ...updates }));
    }
  };

  const deleteUser = (userId, actorRole) => {
    const target = userDirectory.find((u) => u.id === userId);
    if (!target) throw new Error('User not found.');

    // Cannot delete the primary Super Admin
    if (target.id === 'usr-001') {
      throw new Error('Forbidden: The primary Super Admin cannot be deleted.');
    }
    // Admin cannot delete Super Admin or Admin
    if (actorRole === ROLES.ADMIN && target.role !== ROLES.STAFF) {
      throw new Error('Forbidden: Admins can only delete Staff accounts.');
    }
    // Staff cannot delete users
    if (actorRole === ROLES.STAFF) {
      throw new Error('Forbidden: Staff cannot delete accounts.');
    }

    setUserDirectory((prev) => prev.filter((u) => u.id !== userId));
  };

  const toggleUserStatus = (userId, actorRole) => {
    const target = userDirectory.find((u) => u.id === userId);
    if (!target) throw new Error('User not found.');

    if (target.id === 'usr-001') {
      throw new Error('Forbidden: The primary Super Admin cannot be deactivated.');
    }
    if (actorRole === ROLES.ADMIN && target.role === ROLES.SUPER_ADMIN) {
      throw new Error('Forbidden: Admins cannot deactivate a Super Admin.');
    }
    if (actorRole === ROLES.STAFF) {
      throw new Error('Forbidden: Staff cannot deactivate accounts.');
    }

    const nextStatus = target.status === 'Active' ? 'Deactivated' : 'Active';
    updateUser(userId, { status: nextStatus }, actorRole);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userDirectory,
        authError,
        login,
        logout,
        switchDemoRole,
        createUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        getRoleDashboardPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
