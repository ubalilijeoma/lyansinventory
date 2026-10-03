import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchUserProfiles, updateUserProfile, createUserAccount } from '../services/inventoryService';

// System Roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
};

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

/**
 * Resolves a user object from a Supabase auth user and optional profile row.
 * Guarantees ijeomalilianuba@gmail.com is always Super Admin.
 */
function resolveUserObject(authUser, profile = null) {
  const normalizedEmail = (authUser.email || '').trim().toLowerCase();
  const isOwnerSuperAdmin = normalizedEmail === 'ijeomalilianuba@gmail.com';

  const resolvedRole = isOwnerSuperAdmin
    ? ROLES.SUPER_ADMIN
    : profile?.role || authUser.user_metadata?.role || ROLES.STAFF;

  const fullName = isOwnerSuperAdmin
    ? 'Ijeoma Lilian Uba'
    : profile?.full_name || authUser.user_metadata?.full_name || authUser.email.split('@')[0];

  return {
    id: authUser.id,
    name: fullName,
    email: authUser.email,
    role: resolvedRole,
    title: isOwnerSuperAdmin
      ? 'Super Administrator (Executive Owner)'
      : profile?.title || (resolvedRole === ROLES.SUPER_ADMIN ? 'Super Administrator' : resolvedRole === ROLES.ADMIN ? 'Store Admin' : 'Inventory Staff'),
    badgeColor: resolvedRole === ROLES.SUPER_ADMIN ? '#8B5CF6' : resolvedRole === ROLES.ADMIN ? '#1E5BF8' : '#10B981',
    badgeBg: resolvedRole === ROLES.SUPER_ADMIN ? '#F5F3FF' : resolvedRole === ROLES.ADMIN ? '#EEF4FF' : '#ECFDF5',
    status: profile?.status || 'Active',
    assignedLocation: profile?.locations?.name || 'Main Store (Flagship)',
    avatarInitials: isOwnerSuperAdmin ? 'IU' : (profile?.avatar_initials || fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()),
    isProtectedOwner: isOwnerSuperAdmin,
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDirectory, setUserDirectory] = useState([]);
  const [authError, setAuthError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Fetch live profile from Supabase and merge with auth user
  const syncSupabaseUserProfile = useCallback(async (authUser) => {
    try {
      let profile = null;
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*, locations:assigned_location_id(name)')
            .eq('id', authUser.id)
            .single();
          if (!error && data) profile = data;
        } catch (e) {
          console.warn('[AuthContext] Profile query warning:', e.message);
        }
      }

      const userObj = resolveUserObject(authUser, profile);
      setCurrentUser(userObj);
      return userObj;
    } catch (err) {
      console.error('[AuthContext] syncSupabaseUserProfile error:', err);
      return null;
    }
  }, []);

  // Load user directory from Supabase profiles
  const refreshUserDirectory = useCallback(async () => {
    try {
      const result = await fetchUserProfiles();
      if (result.data && result.data.length > 0) {
        setUserDirectory(result.data);
      }
    } catch (err) {
      console.warn('[AuthContext] User directory refresh error:', err.message);
    }
  }, []);

  // Listen to Supabase Auth state changes on mount
  useEffect(() => {
    let subscription = null;

    async function initSupabaseAuth() {
      if (!supabase) {
        setIsInitializing(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await syncSupabaseUserProfile(session.user);
          // Load user directory after confirming auth
          await refreshUserDirectory();
        }
      } catch (err) {
        console.warn('[AuthContext] Session retrieval error:', err.message);
      } finally {
        setIsInitializing(false);
      }

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await syncSupabaseUserProfile(session.user);
          await refreshUserDirectory();
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setUserDirectory([]);
        }
      });

      subscription = data?.subscription;
    }

    initSupabaseAuth();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [syncSupabaseUserProfile, refreshUserDirectory]);

  // Secured Login Handler: Requires valid email and password via Supabase Auth
  const login = async (email, password) => {
    setAuthError(null);
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      const err = 'Work email address is required.';
      setAuthError(err);
      return { success: false, error: err };
    }

    if (!password) {
      const err = 'Password is required to authenticate.';
      setAuthError(err);
      return { success: false, error: err };
    }

    if (!supabase) {
      const err = 'Supabase client is not configured. Check your environment variables.';
      setAuthError(err);
      return { success: false, error: err };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const errMsg = error.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please check your credentials and try again.'
          : error.message;
        setAuthError(errMsg);
        return { success: false, error: errMsg };
      }

      if (data?.user) {
        const userObj = await syncSupabaseUserProfile(data.user);

        // Check if user account is deactivated
        if (userObj?.status === 'Deactivated') {
          await supabase.auth.signOut();
          const err = 'Your account has been deactivated by an administrator. Contact your Super Admin.';
          setAuthError(err);
          setCurrentUser(null);
          return { success: false, error: err };
        }

        return { success: true, user: userObj };
      }

      const err = 'Authentication succeeded but no user data was returned.';
      setAuthError(err);
      return { success: false, error: err };
    } catch (err) {
      const errMsg = `Authentication error: ${err.message}`;
      setAuthError(errMsg);
      return { success: false, error: errMsg };
    }
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
    setUserDirectory([]);
  };

  // Sign up handler with automatic role assignment
  const signUp = async (email, password, fullName = '') => {
    setAuthError(null);
    const normalizedEmail = (email || '').trim().toLowerCase();
    const isOwner = normalizedEmail === 'ijeomalilianuba@gmail.com';
    const role = isOwner ? ROLES.SUPER_ADMIN : ROLES.STAFF;

    if (!normalizedEmail || !password) {
      const err = 'Email and password are both required for account registration.';
      setAuthError(err);
      return { success: false, error: err };
    }

    if (password.length < 6) {
      const err = 'Password must be at least 6 characters long.';
      setAuthError(err);
      return { success: false, error: err };
    }

    if (!supabase) {
      const err = 'Supabase client is not configured.';
      setAuthError(err);
      return { success: false, error: err };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName || (isOwner ? 'Ijeoma Lilian Uba' : normalizedEmail.split('@')[0]),
            role,
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (data?.user) {
        if (data.session) {
          const userObj = await syncSupabaseUserProfile(data.user);
          return { success: true, user: userObj };
        } else {
          return {
            success: true,
            requiresVerification: true,
            message: 'Account created! Check your email for the confirmation link to activate.',
          };
        }
      }
      return { success: true };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ========================================================================
  // User Management CRUD (Supabase-backed with RBAC enforcement)
  // ========================================================================

  const createUser = async (newUserData, actorRole) => {
    if (actorRole === ROLES.ADMIN && newUserData.role !== ROLES.STAFF) {
      throw new Error('Admins are only permitted to create Staff accounts.');
    }
    if (actorRole === ROLES.STAFF) {
      throw new Error('Staff are not permitted to manage user accounts.');
    }

    try {
      // Create auth user in Supabase (triggers handle_new_user which creates profile)
      const authResult = await createUserAccount(
        newUserData.email,
        newUserData.password || 'LyansStaff2026!',
        {
          fullName: newUserData.name,
          role: newUserData.role,
          title: newUserData.title,
        }
      );

      // Refresh directory to pick up the new profile
      await refreshUserDirectory();
      return authResult;
    } catch (err) {
      // If Supabase user creation fails, throw the error
      throw new Error(`Account creation failed: ${err.message}`);
    }
  };

  const updateUser = async (userId, updates, actorRole) => {
    const target = userDirectory.find((u) => u.id === userId);
    if (!target) throw new Error('User not found.');

    if (target.email?.toLowerCase() === 'ijeomalilianuba@gmail.com' || target.isProtectedOwner) {
      if (updates.role && updates.role !== ROLES.SUPER_ADMIN) {
        throw new Error('Forbidden: Cannot demote the Primary Super Admin.');
      }
      if (updates.status && updates.status !== 'Active') {
        throw new Error('Forbidden: Cannot deactivate the Primary Super Admin.');
      }
    }

    if (actorRole === ROLES.ADMIN && target.role === ROLES.SUPER_ADMIN) {
      throw new Error('Forbidden: Admins have no authority to modify a Super Admin.');
    }
    if (actorRole === ROLES.STAFF) {
      throw new Error('Forbidden: Staff cannot modify accounts.');
    }

    try {
      await updateUserProfile(userId, updates);
      // Optimistic local update
      setUserDirectory((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
      );
      // Update currentUser if modifying self
      if (currentUser?.id === userId) {
        setCurrentUser((prev) => ({ ...prev, ...updates }));
      }
    } catch (err) {
      throw new Error(`Profile update failed: ${err.message}`);
    }
  };

  const deleteUser = async (userId, actorRole) => {
    const target = userDirectory.find((u) => u.id === userId);
    if (!target) throw new Error('User not found.');

    if (target.email?.toLowerCase() === 'ijeomalilianuba@gmail.com' || target.isProtectedOwner) {
      throw new Error('Forbidden: Primary Super Admin accounts cannot be deleted.');
    }
    if (actorRole === ROLES.ADMIN && target.role !== ROLES.STAFF) {
      throw new Error('Forbidden: Admins can only delete Staff accounts.');
    }
    if (actorRole === ROLES.STAFF) {
      throw new Error('Forbidden: Staff cannot delete accounts.');
    }

    // For now, deactivate instead of hard-deleting (production best practice)
    // Hard deletion of auth.users requires service_role key or admin API
    try {
      await updateUserProfile(userId, { status: 'Deactivated' });
      setUserDirectory((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'Deactivated' } : u))
      );
    } catch (err) {
      throw new Error(`Account deactivation failed: ${err.message}`);
    }
  };

  const toggleUserStatus = async (userId, actorRole) => {
    const target = userDirectory.find((u) => u.id === userId);
    if (!target) throw new Error('User not found.');

    if (target.email?.toLowerCase() === 'ijeomalilianuba@gmail.com' || target.isProtectedOwner) {
      throw new Error('Forbidden: The primary Super Admin cannot be deactivated.');
    }
    if (actorRole === ROLES.ADMIN && target.role === ROLES.SUPER_ADMIN) {
      throw new Error('Forbidden: Admins cannot deactivate a Super Admin.');
    }
    if (actorRole === ROLES.STAFF) {
      throw new Error('Forbidden: Staff cannot deactivate accounts.');
    }

    const nextStatus = target.status === 'Active' ? 'Deactivated' : 'Active';
    await updateUser(userId, { status: nextStatus }, actorRole);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userDirectory,
        authError,
        isInitializing,
        login,
        signUp,
        logout,
        createUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        refreshUserDirectory,
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
