// src/pages/auth/Register.jsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Stepper, Step, StepLabel, Divider,
} from '@mui/material';
import { BankLogo } from '../../components/ui';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { registerSchema } from '../../utils/validators';
import { BANK_NAME, BANK_IFSC } from '../../config/constants';

const steps = ['Create Account', 'Submit KYC', 'Account Active'];

export const Register = () => {
  const { signUp } = useAuth();
  const navigate   = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      await signUp(data);
      toast.success('Account created! Please submit your KYC.');
      navigate('/kyc');
    } catch (err) {
      toast.error(err.message ?? 'Registration failed.');
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F4F5F8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
    }}>
      {/* Brand */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
          <BankLogo size={38} />
          <Typography variant="h6" fontWeight={700} color="#1A1A1A">{BANK_NAME}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block">IFSC: {BANK_IFSC}</Typography>
      </Box>

      {/* Stepper */}
      <Box sx={{ width: '100%', maxWidth: 460, mb: 2.5 }}>
        <Stepper activeStep={0} alternativeLabel>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Form card */}
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600} pb={1.5}>Step 1 — Create Account</Typography>
        </Box>
        <CardContent sx={{ px: 2.5, pt: 2.5, pb: '20px !important' }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Full name"
              autoComplete="name"
              {...register('fullName')}
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
            />
            <TextField
              label="Email address"
              type="email"
              autoComplete="email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              label="Phone number"
              autoComplete="tel"
              {...register('phone')}
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />
            <TextField
              label="Password"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <TextField
              label="Confirm password"
              type="password"
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={isSubmitting}
              sx={{ mt: 0.5 }}
            >
              {isSubmitting ? 'Creating account…' : 'Continue to KYC'}
            </Button>
          </Box>

          <Divider sx={{ my: 2.5 }} />
          <Typography variant="body2" textAlign="center" color="text.secondary">
            Already registered?{' '}
            <Link to="/login" style={{ color: '#003E8A', fontWeight: 600 }}>Sign in</Link>
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.disabled" mt={3} textAlign="center" display="block">
        &copy; {new Date().getFullYear()} {BANK_NAME}. All rights reserved.
      </Typography>
    </Box>
  );
};
