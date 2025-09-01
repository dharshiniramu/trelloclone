import Navbar from './Navbar';

export default function Layout({ children, showNavbar = true }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {showNavbar && <Navbar />}
      <main className={showNavbar ? '' : 'min-h-screen'}>
        {children}
      </main>
    </div>
  );
}
