import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
            CareForAll
          </Link>

          <div className="flex items-center space-x-4">
            <Link to="/" className="hover:text-blue-300 transition">Home</Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="hover:text-blue-300 transition">Dashboard</Link>
                {isAdmin && (
                  <Link to="/admin" className="hover:text-blue-300 transition">Admin</Link>
                )}
                <div className="flex items-center gap-4 ml-4 border-l border-slate-700 pl-4">
                  <span className="text-sm text-slate-400">Hi, {user?.name || user?.email}</span>
                  <button 
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-blue-300 transition">Login</Link>
                <Link 
                  to="/register" 
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
