import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Divider,
} from '@mui/material';
import { BankLogo } from '../../components/ui';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { loginSchema } from '../../utils/validators';
import { BANK_NAME } from '../../config/constants';

const Skyline = () => (
  <svg viewBox="0 0 480 160" xmlns="http://www.w3.org/2000/svg" width="100%" style={{ display: 'block', marginTop: 'auto' }}>
    <defs>
      <radialGradient id="glow" cx="50%" cy="100%" r="60%">
        <stop offset="0%" stopColor="rgba(0,85,165,0.4)" />
        <stop offset="100%" stopColor="rgba(0,85,165,0)" />
      </radialGradient>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(0,21,64,0)" />
        <stop offset="100%" stopColor="rgba(0,21,64,0.7)" />
      </linearGradient>
    </defs>

    {/* Glow on horizon */}
    <ellipse cx="240" cy="155" rx="240" ry="60" fill="url(#glow)" />

    {/* ── Far layer (faintest) ── */}
    <g fill="rgba(255,255,255,0.10)">
      <rect x="0"   y="95"  width="28" height="65" />
      <rect x="22"  y="75"  width="16" height="85" />
      <rect x="35"  y="88"  width="32" height="72" />
      <rect x="62"  y="68"  width="14" height="92" />
      <rect x="73"  y="82"  width="38" height="78" />
      <rect x="107" y="60"  width="22" height="100"/>
      <rect x="125" y="72"  width="28" height="88" />
      <rect x="149" y="50"  width="16" height="110"/>
      <rect x="162" y="78"  width="36" height="82" />
      <rect x="195" y="65"  width="20" height="95" />
      <rect x="212" y="55"  width="26" height="105"/>
      <rect x="234" y="80"  width="34" height="80" />
      <rect x="265" y="70"  width="18" height="90" />
      <rect x="280" y="58"  width="30" height="102"/>
      <rect x="307" y="75"  width="24" height="85" />
      <rect x="328" y="62"  width="28" height="98" />
      <rect x="353" y="85"  width="38" height="75" />
      <rect x="388" y="72"  width="22" height="88" />
      <rect x="408" y="80"  width="36" height="80" />
      <rect x="440" y="65"  width="20" height="95" />
      <rect x="458" y="78"  width="22" height="82" />
    </g>

    {/* ── Mid layer ── */}
    <g fill="rgba(255,255,255,0.18)">
      <rect x="0"   y="105" width="42" height="55" />
      <rect x="38"  y="90"  width="22" height="70" />
      <rect x="56"  y="100" width="48" height="60" />
      <rect x="99"  y="78"  width="20" height="82" />
      <rect x="116" y="92"  width="38" height="68" />
      <rect x="150" y="68"  width="16" height="92" />
      <rect x="163" y="85"  width="42" height="75" />
      <rect x="200" y="72"  width="28" height="88" />
      <rect x="225" y="88"  width="36" height="72" />
      <rect x="257" y="78"  width="22" height="82" />
      <rect x="276" y="68"  width="38" height="92" />
      <rect x="311" y="82"  width="32" height="78" />
      <rect x="340" y="74"  width="28" height="86" />
      <rect x="366" y="88"  width="44" height="72" />
      <rect x="407" y="78"  width="24" height="82" />
      <rect x="429" y="85"  width="51" height="75" />
    </g>

    {/* ── Near layer (clearest) ── */}
    <g fill="rgba(255,255,255,0.28)">
      <rect x="0"   y="112" width="50" height="48" />
      <rect x="46"  y="98"  width="28" height="62" />
      <rect x="70"  y="108" width="55" height="52" />
      {/* Tall tower */}
      <rect x="120" y="70"  width="18" height="90" />
      <rect x="134" y="82"  width="4"  height="6"  />  {/* antenna */}
      <rect x="136" y="78"  width="2"  height="4"  />
      <rect x="137" y="68"  width="1"  height="10" />
      <rect x="148" y="102" width="42" height="58" />
      <rect x="186" y="85"  width="32" height="75" />
      {/* Central tall building */}
      <rect x="214" y="62"  width="22" height="98" />
      <rect x="225" y="55"  width="4"  height="8"  />
      <rect x="226" y="45"  width="2"  height="10" />
      <rect x="232" y="95"  width="48" height="65" />
      <rect x="276" y="88"  width="26" height="72" />
      <rect x="298" y="75"  width="38" height="85" />
      <rect x="332" y="90"  width="34" height="70" />
      <rect x="363" y="80"  width="28" height="80" />
      <rect x="388" y="95"  width="50" height="65" />
      <rect x="435" y="88"  width="45" height="72" />
    </g>

    {/* ── Lit windows ── */}
    <g fill="rgba(255,220,130,0.55)">
      <rect x="26"  y="93"  width="3" height="2" />
      <rect x="31"  y="98"  width="3" height="2" />
      <rect x="112" y="62"  width="4" height="3" />
      <rect x="117" y="70"  width="4" height="3" />
      <rect x="157" y="71"  width="4" height="3" />
      <rect x="218" y="68"  width="4" height="3" />
      <rect x="218" y="78"  width="4" height="3" />
      <rect x="222" y="74"  width="4" height="3" />
      <rect x="284" y="70"  width="4" height="3" />
      <rect x="302" y="78"  width="4" height="3" />
      <rect x="308" y="65"  width="4" height="3" />
      <rect x="335" y="80"  width="4" height="3" />
      <rect x="369" y="82"  width="3" height="2" />
      <rect x="394" y="98"  width="3" height="2" />
      <rect x="442" y="90"  width="3" height="2" />
    </g>

    {/* ── Stars ── */}
    <g fill="rgba(255,255,255,0.65)">
      <circle cx="18"  cy="12" r="1.0" />
      <circle cx="55"  cy="8"  r="1.2" />
      <circle cx="88"  cy="20" r="0.8" />
      <circle cx="130" cy="10" r="1.0" />
      <circle cx="170" cy="18" r="0.7" />
      <circle cx="205" cy="6"  r="1.1" />
      <circle cx="258" cy="14" r="0.9" />
      <circle cx="310" cy="8"  r="1.0" />
      <circle cx="350" cy="20" r="0.8" />
      <circle cx="398" cy="10" r="1.2" />
      <circle cx="440" cy="16" r="0.9" />
      <circle cx="470" cy="7"  r="0.8" />
    </g>

    {/* ── Crescent moon ── */}
    <circle cx="448" cy="28" r="14" fill="rgba(255,255,255,0.18)" />
    <circle cx="441" cy="24" r="11" fill="rgba(0,30,80,0.95)" />

    {/* ── Bottom ground line ── */}
    <rect x="0" y="158" width="480" height="2" fill="rgba(255,255,255,0.12)" />

    {/* Depth fade overlay */}
    <rect x="0" y="0" width="480" height="160" fill="url(#fade)" />
  </svg>
);

export const Login = () => {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname ?? '/dashboard';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }) => {
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message ?? 'Login failed.');
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(155deg, #001040 0%, #002266 45%, #003E8A 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: { xs: 2, md: 4 },
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow blobs */}
      <Box sx={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,85,165,0.25) 0%, transparent 70%)',
        top: '-200px', right: '-100px', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(226,32,38,0.10) 0%, transparent 70%)',
        bottom: '-100px', left: '-80px', pointerEvents: 'none',
      }} />

      {/* Card shell */}
      <Box sx={{
        display: 'flex',
        width: '100%',
        maxWidth: 880,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
      }}>
        {/* ── Left panel (desktop) ── */}
        <Box sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          flex: 1,
          background: 'linear-gradient(160deg, rgba(0,30,80,0.6) 0%, rgba(0,55,130,0.4) 100%)',
          backdropFilter: 'blur(2px)',
          borderRight: '1px solid rgba(255,255,255,0.10)',
          p: 4,
          pb: 0,
          overflow: 'hidden',
        }}>
          {/* Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <BankLogo size={42} color="white" />
            <Typography fontWeight={700} fontSize={18} color="#fff" lineHeight={1.2}>
              {BANK_NAME}
            </Typography>
          </Box>

          <Typography fontSize={22} fontWeight={700} color="#fff" lineHeight={1.35} mb={1.5}>
            Banking at your<br />fingertips.
          </Typography>
          <Typography fontSize={13} sx={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            Manage accounts, send money, track transactions, and more — all in one secure place.
          </Typography>

          {/* Feature list */}
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {['Instant fund transfers', 'Real-time notifications', 'KYC & loan management'].map(f => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#E22026', flexShrink: 0 }} />
                <Typography fontSize={12} sx={{ color: 'rgba(255,255,255,0.60)' }}>{f}</Typography>
              </Box>
            ))}
          </Box>

          {/* Skyline fills remaining vertical space */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', mt: 3 }}>
            <Skyline />
          </Box>
        </Box>

        {/* ── Right panel — form ── */}
        <Box sx={{
          width: { xs: '100%', md: 380 },
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          p: { xs: 3, md: 4 },
        }}>
          {/* Mobile logo */}
          <Box sx={{ display: { md: 'none' }, mb: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
              <BankLogo size={34} />
              <Typography fontWeight={700} fontSize={15} color="text.primary">{BANK_NAME}</Typography>
            </Box>
          </Box>

          <Typography variant="h6" fontWeight={700} color="text.primary" mb={0.5}>
            Sign In
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Customer ID / Email"
              type="email"
              autoComplete="email"
              autoFocus
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              label="Password / IPIN"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={isSubmitting}
              sx={{ mt: 0.5 }}
            >
              {isSubmitting ? 'Signing in…' : 'Login'}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="body2" textAlign="center" color="text.secondary">
            New customer?{' '}
            <Link to="/register" style={{ color: '#003E8A', fontWeight: 600 }}>
              Register now
            </Link>
          </Typography>

        </Box>
      </Box>
    </Box>
  );
};
