import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Notifications from './Notifications';
import Chat from './Chat';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Notifications />
      <Chat />
      <footer className="bg-white border-t py-6 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} CareForAll. All rights reserved.
      </footer>
    </div>
  );
}
