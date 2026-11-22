// Used only by the isolated QA server; production authorization is unchanged.
export const useAuth = () => ({
  user: {
    id: "00000000-0000-4000-8000-000000000802",
    email: "teacher@example.test",
  },
  profile: { full_name: "Rony Trainer", role: "trainer" },
  loading: false,
  isTrainer: true,
  isAdmin: false,
  isSuperAdmin: false,
  userRole: "trainer",
  roleStatus: "ready",
  retryIdentity: async () => {},
  logout: async () => {},
});
export const AuthProvider = ({ children }) => children;
