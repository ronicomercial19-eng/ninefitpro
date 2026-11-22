export const useAuth = () => ({
  user: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "qa@example.test",
  },
  profile: { full_name: "Marina Silva" },
  loading: false,
  userRole: "student",
  roleStatus: "ready",
  logout: async () => {},
});
export const AuthProvider = ({ children }) => children;
