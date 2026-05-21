import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, Button, IconButton,
  Badge, Menu, MenuItem, Divider,
} from '@mui/material';
import { BankLogo } from '../ui';
import NotificationsIcon  from '@mui/icons-material/Notifications';
import MenuIcon           from '@mui/icons-material/Menu';
import LogoutIcon         from '@mui/icons-material/Logout';
import { useAuth }        from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { BANK_NAME }      from '../../config/constants';

const staffNav = [
  { to: '/dashboard',     label: 'Dashboard'    },
  { to: '/send-money',    label: 'Send Money'   },
  { to: '/transactions',  label: 'Transactions' },
  { to: '/accounts',      label: 'Accounts'     },
  { to: '/notifications', label: 'Notifications', badge: true },
];

const customerNav = [
  { to: '/dashboard',     label: 'Dashboard'  },
  { to: '/kyc',           label: 'KYC'        },
  { to: '/portfolio',     label: 'Portfolio'  },
  { to: '/send-money',    label: 'Send Money' },
  { to: '/loans',         label: 'Loans'      },
  { to: '/transactions',  label: 'Transfers'  },
  { to: '/notifications', label: 'Alerts', badge: true },
];

const NAV_H = 58;

export const Layout = ({ children }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isManager, isStaff, isCustomer, logout, staffData, customerData } = useAuth();
  const { unreadCount } = useNotifications();
  const [menuAnchor, setMenuAnchor] = useState(null);

  const baseNav  = isCustomer ? customerNav : staffNav;
  const navItems = [
    ...baseNav,
    ...(isStaff && isManager ? [{ to: '/admin', label: 'Admin' }] : []),
  ];
  const userName = staffData?.name ?? customerData?.fullName ?? 'User';

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" color="inherit" elevation={0}>
        <Toolbar
          sx={{
            px: { xs: 2, md: 3 },
            minHeight: `${NAV_H}px !important`,
            height: NAV_H,
            flexWrap: 'nowrap',
            gap: 0,
          }}
        >
          {/* Logo */}
          <Box
            onClick={() => navigate('/dashboard')}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.25,
              cursor: 'pointer', flexShrink: 0, mr: 2,
            }}
          >
            <BankLogo size={28} />
            <Typography fontWeight={700} fontSize={14} color="text.primary" noWrap>
              {BANK_NAME}
            </Typography>
          </Box>

          {/* Nav links — desktop */}
          <Box sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
            height: NAV_H,
            overflow: 'hidden',
          }}>
            {navItems.map(({ to, label, badge }) => {
              const active = isActive(to);
              return (
                <Button
                  key={to}
                  onClick={() => navigate(to)}
                  disableElevation
                  sx={{
                    height: NAV_H,
                    px: 1.75,
                    flexShrink: 0,
                    borderRadius: 0,
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    whiteSpace: 'nowrap',
                    color: active ? 'secondary.main' : 'text.secondary',
                    textTransform: 'none',
                    bgcolor: 'transparent',
                    borderBottom: '2px solid',
                    borderBottomColor: active ? 'secondary.main' : 'transparent',
                    position: 'relative',
                    '&:hover': {
                      bgcolor: 'grey.50',
                      color: 'secondary.main',
                      borderBottomColor: active ? 'secondary.main' : 'divider',
                    },
                  }}
                >
                  {label}
                  {badge && unreadCount > 0 && (
                    <Box sx={{
                      position: 'absolute', top: 11, right: 6,
                      width: 6, height: 6,
                      bgcolor: '#E22026', borderRadius: '50%',
                    }} />
                  )}
                </Button>
              );
            })}
          </Box>

          {/* Right — desktop */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, ml: 'auto', flexShrink: 0 }}>
            <IconButton size="small" onClick={() => navigate('/notifications')} sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={unreadCount} color="error" max={9}>
                <NotificationsIcon sx={{ fontSize: 19 }} />
              </Badge>
            </IconButton>
            <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5 }} />
            <Typography fontSize={13} fontWeight={500} color="text.primary" noWrap sx={{ maxWidth: 140 }}>
              {userName}
            </Typography>
            <IconButton size="small" onClick={logout} sx={{ color: 'text.secondary', ml: 0.5 }} title="Sign out">
              <LogoutIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>

          {/* Right — mobile */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.5, ml: 'auto' }}>
            <IconButton size="small" onClick={() => navigate('/notifications')} sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={unreadCount} color="error" max={9}>
                <NotificationsIcon sx={{ fontSize: 19 }} />
              </Badge>
            </IconButton>
            <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile dropdown */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 200, mt: 0.5 } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {navItems.map(({ to, label, badge }) => (
          <MenuItem
            key={to}
            selected={isActive(to)}
            onClick={() => { navigate(to); setMenuAnchor(null); }}
          >
            {label}
            {badge && unreadCount > 0 && (
              <Box sx={{ ml: 'auto', pl: 2, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 6, height: 6, bgcolor: '#E22026', borderRadius: '50%' }} />
              </Box>
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem disabled sx={{ fontSize: 12 }}>{userName}</MenuItem>
        <MenuItem onClick={logout} sx={{ color: 'error.main' }}>Sign out</MenuItem>
      </Menu>

      {/* Content */}
      <Box component="main" sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
