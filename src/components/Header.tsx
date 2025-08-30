import React from 'react';
import { useScenarioStore } from '../store/scenario-store';
import { useAuth } from '../hooks/useAuth';
import { Calculator, User, LogOut, Share2 } from 'lucide-react';

interface HeaderProps {
  onAuthClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAuthClick }) => {
  const { currentScenario, clearScenario, shareScenario } = useScenarioStore();
  const { user, signOut } = useAuth();

  const handleShare = () => {
    if (currentScenario) {
      shareScenario(currentScenario);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cap Table Simulator</h1>
              {currentScenario && (
                <p className="text-sm text-gray-600">{currentScenario.name}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {currentScenario && (
              <>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={clearScenario}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  New Scenario
                </button>
              </>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={onAuthClick}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};