// src/components/ui/index.jsx — HDFC-style MUI components

export const BankLogo = ({ size = 32, color = '#E22026' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text
      x="16" y="23"
      textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontWeight="700"
      fontSize="20"
      letterSpacing="-1"
      fill={color}
    >AB</text>
  </svg>
);

import {
  Card as MuiCard, CardContent, CardHeader,
  CircularProgress, Box, Typography, Chip,
  Button as MuiButton, TextField, MenuItem,
} from '@mui/material';
import ArrowDropUpIcon   from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// Stat card — clean flat white, used across dashboards
export const StatCard = ({ label, value, sub, icon: Icon, trend, trendLabel, color }) => (
  <MuiCard>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="caption"
          sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: 'text.secondary', fontSize: 11 }}
        >
          {label}
        </Typography>
        {Icon && (
          <Icon sx={{ fontSize: 18, color: color ?? 'primary.main', opacity: 0.8 }} />
        )}
      </Box>
      <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ fontSize: '1.375rem', letterSpacing: '-0.01em' }}>
        {value}
      </Typography>
      {(sub || trendLabel) && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.75, gap: 0.25 }}>
          {trend !== undefined && (
            trend >= 0
              ? <ArrowDropUpIcon sx={{ fontSize: 16, color: 'success.main', mt: '-1px' }} />
              : <ArrowDropDownIcon sx={{ fontSize: 16, color: 'error.main', mt: '-1px' }} />
          )}
          <Typography variant="caption" color="text.secondary">
            {trendLabel ?? sub}
          </Typography>
        </Box>
      )}
    </CardContent>
  </MuiCard>
);

// Generic card — white, minimal border
export const Card = ({ children, title, action, sx = {}, noPadding }) => (
  <MuiCard sx={sx}>
    {(title || action) && (
      <CardHeader
        title={title}
        action={action}
      />
    )}
    <CardContent sx={noPadding ? { p: 0, '&:last-child': { pb: 0 } } : {}}>
      {children}
    </CardContent>
  </MuiCard>
);

// Page section heading with optional right element
export const SectionHeader = ({ title, subtitle, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
    <Box>
      <Typography variant="h6" fontWeight={700} color="text.primary">{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" mt={0.25}>{subtitle}</Typography>}
    </Box>
    {action && <Box>{action}</Box>}
  </Box>
);

export const LoadingSpinner = ({ message = 'Loading…' }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 240, gap: 2 }}>
    <CircularProgress size={28} color="primary" />
    <Typography variant="body2" color="text.secondary">{message}</Typography>
  </Box>
);

export const EmptyState = ({ message = 'No records found.', icon: Icon }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, gap: 1 }}>
    {Icon && <Icon sx={{ fontSize: 32, color: 'text.disabled' }} />}
    <Typography variant="body2" color="text.secondary">{message}</Typography>
  </Box>
);

const STATUS_MAP = {
  completed:    { color:'success', label:'Completed'   },
  pending:      { color:'warning', label:'Pending'     },
  failed:       { color:'error',   label:'Failed'      },
  active:       { color:'success', label:'Active'      },
  inactive:     { color:'default', label:'Inactive'    },
  frozen:       { color:'info',    label:'Frozen'      },
  approved:     { color:'success', label:'Approved'    },
  hold:         { color:'warning', label:'On Hold'     },
  rejected:     { color:'error',   label:'Rejected'    },
  rolled_back:  { color:'default', label:'Rolled Back' },
  cancelled:    { color:'default', label:'Cancelled'   },
};

export const StatusChip = ({ status }) => {
  const cfg = STATUS_MAP[status] ?? { color: 'default', label: status ?? '' };
  return <Chip size="small" color={cfg.color} label={cfg.label} />;
};

// Thin horizontal divider used between list items
export const RowDivider = () => (
  <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', mx: 0 }} />
);

// Key-value detail row used in cards
export const DetailRow = ({ label, value, last }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 1.25 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ textAlign: 'right', textTransform: 'capitalize' }}>{value}</Typography>
    </Box>
    {!last && <RowDivider />}
  </Box>
);

// Compatibility wrappers
export const Button = ({
  children, type = 'button', variant = 'primary',
  size = 'md', disabled = false, loading = false,
  onClick, ...rest
}) => (
  <MuiButton
    type={type}
    variant={variant === 'secondary' || variant === 'ghost' ? 'outlined' : 'contained'}
    color={variant === 'danger' ? 'error' : 'primary'}
    size={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium'}
    disabled={disabled || loading}
    onClick={onClick}
    startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
    {...rest}
  >
    {children}
  </MuiButton>
);

export const Input = ({ label, name, error, hint, type = 'text', register, placeholder, ...rest }) => (
  <TextField
    label={label} type={type} placeholder={placeholder}
    error={!!error} helperText={error || hint}
    {...(register ? register(name) : {})}
    {...rest}
  />
);

export const Select = ({ label, name, error, options = [], register, ...rest }) => (
  <TextField
    select label={label} error={!!error} helperText={error}
    {...(register ? register(name) : {})}
    {...rest}
  >
    {options.map(({ value, label: l }) => (
      <MenuItem key={value} value={value}>{l}</MenuItem>
    ))}
  </TextField>
);

export const Badge = ({ children, color }) => (
  <Chip size="small" label={children}
    color={color === 'red' ? 'error' : color === 'green' ? 'success' : 'default'} />
);
