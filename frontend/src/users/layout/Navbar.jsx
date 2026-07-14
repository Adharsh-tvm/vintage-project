import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingBag, User, Menu, X, Heart,
  LogOut, UserCircle, Wallet, ChevronDown, Package
} from 'lucide-react';
import { useSelector } from 'react-redux';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../../ui/DropDownMenu';
import { Button } from '../../ui/Button';
import { cartCountApi } from '../../services/api/userApis/cartApi';
import { wishlistCountApi } from '../../services/api/userApis/wishlistApi';
import { debounce } from 'lodash';
import { globalSearchApi } from '../../services/api/userApis/userProductApi';

// ── Logout Confirmation Modal ─────────────────────────────────────────────────
const LogoutConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: '1rem',
        padding: '2rem', width: '22rem',
        boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '0.375rem' }}>
            Sign out?
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Are you sure you want to sign out of your account?
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.625rem',
              border: '1.5px solid #e5e7eb', background: '#fff',
              fontSize: '0.875rem', fontWeight: 500, color: '#374151',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.625rem',
              background: '#1243D6', color: '#fff',
              fontSize: '0.875rem', fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#0e32a4'}
            onMouseLeave={e => e.currentTarget.style.background = '#1243D6'}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Navbar ────────────────────────────────────────────────────────────────────
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.userInfo);
  const [storedUser, setStoredUser] = useState(null);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const userFromStorage = localStorage.getItem('userInfo');
    if (userFromStorage) setStoredUser(JSON.parse(userFromStorage));
  }, []);

  useEffect(() => {
    if (user || storedUser) {
      fetchCartCount();
      fetchWishlistCount();
    }
  }, [user, storedUser]);

  useEffect(() => {
    const handleCartUpdate = () => {
      fetchCartCount();
    };
    const handleWishlistUpdate = () => {
      fetchWishlistCount();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    };
  }, [user, storedUser]);

  // Scroll shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard: close search on Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { setSearchOpen(false); setShowResults(false); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  const fetchCartCount = async () => {
    if (user || storedUser) {
      try {
        const response = await cartCountApi();
        if (response.data && response.data.items) {
          const totalQuantity = response.data.items.reduce((sum, item) => sum + item.quantity, 0);
          setCartCount(totalQuantity);
        }
      } catch (error) {
        console.error('Error fetching cart count:', error);
        setCartCount(0);
      }
    }
  };

  const fetchWishlistCount = async () => {
    if (user || storedUser) {
      try {
        const response = await wishlistCountApi();
        if (response.data) setWishlistCount(response.data.length || 0);
      } catch (error) {
        console.error('Error fetching wishlist count:', error);
        setWishlistCount(0);
      }
    }
  };

  const handleLogout = () => setShowLogoutConfirmation(true);

  const confirmLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('jwt');
    navigate('/login');
    window.location.reload();
    setShowLogoutConfirmation(false);
  };

  const currentUser = user || storedUser;

  const getFullName = () => {
    if (!currentUser) return '';
    const firstName = currentUser.firstname || '';
    const lastName = currentUser.lastname || '';
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (currentUser.email) return currentUser.email.split('@')[0];
    return 'User';
  };

  const getProfileImage = () => {
    if (!currentUser) return null;
    return currentUser.profileImage || currentUser.image || null;
  };

  // Debounced search
  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q.trim()) { setSearchResults([]); return; }
      try {
        const { data } = await globalSearchApi(q);
        if (data.success && Array.isArray(data.products)) {
          setSearchResults(
            data.products.filter(p => p.variants?.length > 0 && !p.isBlocked).slice(0, 6)
          );
          setShowResults(true);
        }
      } catch (_) { }
    }, 300),
    []
  );

  useEffect(() => { doSearch(searchQuery); }, [searchQuery]);

  const handleSearchItemClick = (productId) => {
    navigate(`/products/${productId}`);
    setSearchOpen(false);
    setShowResults(false);
    setSearchQuery('');
  };

  const navLinks = [
    { label: 'Products', href: '/products' },
  ];

  // ── Styles ──────────────────────────────────────────────────────────────────
  const navbarStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: '#fff',
    borderBottom: '1px solid #f3f4f6',
    boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.06)' : 'none',
    transition: 'box-shadow 0.25s ease',
  };

  const iconBtnStyle = {
    position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '2.25rem', height: '2.25rem',
    borderRadius: '0.625rem',
    background: 'transparent',
    border: 'none', cursor: 'pointer',
    color: '#374151',
    transition: 'background 0.15s, color 0.15s',
  };

  return (
    <>
      <header style={navbarStyle}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '4rem', gap: '1rem' }}>

            {/* Logo */}
            <Link
              to="/"
              style={{
                fontSize: '1.375rem', fontWeight: 900,
                letterSpacing: '-0.04em', color: '#111827',
                textDecoration: 'none', flexShrink: 0,
                userSelect: 'none',
              }}
            >
              VINT<span style={{ color: '#e11d48' }}>AGE</span>
            </Link>

            {/* Desktop Nav Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '1.5rem' }} className="hidden md:flex">
              {navLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    fontSize: '0.875rem', fontWeight: 500,
                    color: '#4b5563', padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem', textDecoration: 'none',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#111827'; e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'transparent'; }}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Desktop Search Bar */}
            <div
              ref={searchRef}
              className="hidden md:block"
              style={{ position: 'relative', width: searchOpen ? '20rem' : '10rem', transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', color: '#9ca3af', pointerEvents: 'none', zIndex: 1 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onFocus={() => { setSearchOpen(true); if (searchResults.length > 0) setShowResults(true); }}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
                      setShowResults(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 2rem 0.5rem 2.25rem',
                    fontSize: '0.875rem',
                    border: searchOpen ? '1.5px solid #111827' : '1.5px solid #e5e7eb',
                    borderRadius: '0.625rem',
                    outline: 'none',
                    background: searchOpen ? '#fff' : '#f9fafb',
                    color: '#111827',
                    transition: 'all 0.25s',
                    cursor: searchOpen ? 'text' : 'pointer',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
                    style={{
                      position: 'absolute', right: '0.5rem',
                      background: '#f3f4f6', border: 'none', borderRadius: '50%',
                      width: '1.25rem', height: '1.25rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={11} color="#6b7280" />
                  </button>
                )}
              </div>

              {/* Search dropdown */}
              {showResults && searchQuery.trim() && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, right: 0,
                  background: '#fff', borderRadius: '0.875rem',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  border: '1px solid #f3f4f6',
                  overflow: 'hidden', zIndex: 100,
                }}>
                  <div>
                    <div style={{ padding: '0.625rem 1rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #f9fafb' }}>
                      Results
                    </div>
                    {searchResults.map((product) => (
                      <div
                        key={product._id}
                        onClick={() => handleSearchItemClick(product._id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.625rem 1rem', cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: '2.5rem', height: '3rem', borderRadius: '0.375rem', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6' }}>
                          <img
                            src={product.variants[0]?.mainImage}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {product.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{product.category?.name}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827', marginTop: '0.125rem' }}>
                            ₹{Math.min(...product.variants.map(v => v.price)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        padding: '0.625rem 1rem', borderTop: '1px solid #f9fafb',
                        fontSize: '0.8rem', fontWeight: 500, color: '#6b7280',
                        cursor: 'pointer', textAlign: 'center', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => {
                        navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
                        setShowResults(false);
                      }}
                    >
                      See all results for "<strong>{searchQuery}</strong>"
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Icons — Desktop */}
            <div className="hidden md:flex items-center" style={{ gap: '0.25rem' }}>
              {currentUser ? (
                <>
                  {/* Wishlist */}
                  <Link
                    to="/wishlist"
                    style={iconBtnStyle}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#111827'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; }}
                  >
                    <Heart size={19} />
                    {wishlistCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '0.1rem', right: '0.1rem',
                        background: '#e11d48', color: '#fff',
                        fontSize: '0.6rem', fontWeight: 800,
                        borderRadius: '999px',
                        minWidth: '1rem', height: '1rem',
                        display: 'flex', alignItems: 'center', justifycontent: 'center',
                        padding: '0 0.2rem',
                        border: '1.5px solid #fff',
                      }}>
                        {wishlistCount > 9 ? '9+' : wishlistCount}
                      </span>
                    )}
                  </Link>

                  {/* Cart */}
                  <Link
                    to="/cart"
                    style={iconBtnStyle}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#111827'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; }}
                  >
                    <ShoppingBag size={19} />
                    {cartCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '0.1rem', right: '0.1rem',
                        background: '#111827', color: '#fff',
                        fontSize: '0.6rem', fontWeight: 800,
                        borderRadius: '999px',
                        minWidth: '1rem', height: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 0.2rem',
                        border: '1.5px solid #fff',
                      }}>
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </Link>

                  {/* User dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.375rem 0.625rem 0.375rem 0.375rem',
                          borderRadius: '0.75rem',
                          border: '1.5px solid #e5e7eb',
                          background: '#fff', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                      >
                        {getProfileImage() ? (
                          <img
                            src={getProfileImage()}
                            alt="Profile"
                            style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', objectFit: 'cover', border: '2px solid #f3f4f6' }}
                          />
                        ) : (
                          <div style={{
                            width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                            background: '#111827', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 700,
                          }}>
                            {getFullName().charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', maxWidth: '6rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getFullName()}
                        </span>
                        <ChevronDown size={13} color="#9ca3af" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => navigate('/profile')}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>My Account</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/orders')}>
                        <Package className="mr-2 h-4 w-4" />
                        <span>My Orders</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/wishlist')}>
                        <Heart className="mr-2 h-4 w-4" />
                        <span>My Wishlist</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/wallet')}>
                        <Wallet className="mr-2 h-4 w-4" />
                        <span>Wallet</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout} style={{ color: '#ef4444' }}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: '0.625rem',
                    background: '#111827', color: '#fff',
                    fontSize: '0.875rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1f2937'}
                  onMouseLeave={e => e.currentTarget.style.background = '#111827'}
                >
                  Sign in
                </button>
              )}
            </div>

            {/* Mobile: Cart + Menu button */}
            <div className="md:hidden flex items-center" style={{ gap: '0.5rem' }}>
              {currentUser && (
                <Link to="/cart" style={{ ...iconBtnStyle }}>
                  <ShoppingBag size={19} />
                  {cartCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '0.1rem', right: '0.1rem',
                      background: '#111827', color: '#fff',
                      fontSize: '0.6rem', fontWeight: 800,
                      borderRadius: '999px', minWidth: '1rem', height: '1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 0.2rem', border: '1.5px solid #fff',
                    }}>
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                style={{ ...iconBtnStyle }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Menu */}
        <div
          style={{
            maxHeight: isMenuOpen ? '600px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            borderTop: isMenuOpen ? '1px solid #f3f4f6' : 'none',
          }}
          className="md:hidden"
        >
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>

            {/* Mobile Search */}
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
                    setIsMenuOpen(false);
                  }
                }}
                style={{
                  width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem',
                  fontSize: '0.875rem',
                  border: '1.5px solid #e5e7eb', borderRadius: '0.625rem',
                  outline: 'none', background: '#f9fafb',
                }}
                onFocus={e => e.target.style.borderColor = '#111827'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {currentUser ? (
              <>
                {/* User info */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem', borderRadius: '0.75rem',
                  background: '#f9fafb', marginBottom: '0.5rem',
                }}>
                  {getProfileImage() ? (
                    <img src={getProfileImage()} alt="Profile" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>
                      {getFullName().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{getFullName()}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{currentUser.email}</div>
                  </div>
                </div>

                {[
                  { label: 'Products', href: '/products' },
                  { label: 'My Account', href: '/profile' },
                  { label: 'My Orders', href: '/orders' },
                  { label: 'Wishlist', href: '/wishlist', count: wishlistCount },
                  { label: 'Cart', href: '/cart', count: cartCount },
                  { label: 'Wallet', href: '/wallet' },
                ].map(item => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.625rem 0.75rem', borderRadius: '0.625rem',
                      fontSize: '0.875rem', fontWeight: 500, color: '#374151',
                      textDecoration: 'none', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {item.label}
                    {item.count > 0 && (
                      <span style={{ background: '#111827', color: '#fff', fontSize: '0.65rem', fontWeight: 700, borderRadius: '999px', padding: '0.1rem 0.45rem' }}>
                        {item.count}
                      </span>
                    )}
                  </Link>
                ))}

                <button
                  onClick={handleLogout}
                  style={{
                    marginTop: '0.5rem', padding: '0.625rem 0.75rem',
                    borderRadius: '0.625rem', textAlign: 'left',
                    fontSize: '0.875rem', fontWeight: 500,
                    color: '#ef4444', background: '#fef2f2',
                    border: 'none', cursor: 'pointer', width: '100%',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/products"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ padding: '0.625rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151', textDecoration: 'none' }}
                >
                  Products
                </Link>
                <button
                  onClick={() => { navigate('/login'); setIsMenuOpen(false); }}
                  style={{
                    marginTop: '0.5rem', padding: '0.75rem',
                    borderRadius: '0.75rem', background: '#111827',
                    color: '#fff', fontWeight: 600, fontSize: '0.875rem',
                    border: 'none', cursor: 'pointer', width: '100%',
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <LogoutConfirmationModal
        isOpen={showLogoutConfirmation}
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}