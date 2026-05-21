// src/pages/accounts/CreateAccount.jsx — MUI

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box, Typography, TextField, Button, MenuItem,
  Card, CardContent, List, ListItemButton,
  ListItemText, InputAdornment, Chip, Alert,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon    from '@mui/icons-material/Search';
import CheckIcon     from '@mui/icons-material/Check';
import toast from 'react-hot-toast';
import { getAllCustomers, createAccount } from '../../services/accountService';
import { registerPublicAccount } from '../../services/hubService';
import { rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import { ACCOUNT_TYPES } from '../../config/constants';
import { LoadingSpinner } from '../../components/ui';

const schema = z.object({
  accountType:    z.enum(['savings','current','salary','fd']),
  initialDeposit: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Invalid amount'),
});

export const CreateAccount = () => {
  const navigate = useNavigate();
  const [customers,       setCustomers]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState('');
  const [selectedCustomer,setSelectedCustomer]= useState(null);
  const [showList,        setShowList]        = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { accountType: 'savings', initialDeposit: '1000' },
  });

  useEffect(() => {
    getAllCustomers()
      .then(c => setCustomers(c.filter(x => x.kycStatus === 'approved')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return c.fullName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const onSubmit = async (data) => {
    if (!selectedCustomer) { toast.error('Select a customer.'); return; }
    try {
      const { id, accountNumber } = await createAccount({
        customerId:         selectedCustomer.id,
        accountType:        data.accountType,
        initialDepositPaise: rupeesToPaise(data.initialDeposit),
      });
      await registerPublicAccount(id, accountNumber);
      toast.success(`Account opened for ${selectedCustomer.fullName}`);
      navigate(`/accounts/${id}`);
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <LoadingSpinner message="Loading approved customers…" />;

  return (
    <Box sx={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon /> Open New Account
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Only KYC-approved customers are shown.
        </Typography>
      </Box>

      {/* Step 1 — Select customer */}
      <Card sx={{ overflow: 'visible' }}>
        <CardContent sx={{ overflow: 'visible' }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Step 1 — Select customer</Typography>

          {customers.length === 0 ? (
            <Alert severity="info">No KYC-approved customers yet. Approve KYC from Admin Dashboard.</Alert>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, email or phone…"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowList(true); }}
                onFocus={() => setShowList(true)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              />

              {/* Selected badge */}
              {selectedCustomer && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'primary.light', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600} color="primary.dark">{selectedCustomer.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">{selectedCustomer.email}</Typography>
                  </Box>
                  <CheckIcon color="primary" />
                </Box>
              )}

              {/* Dropdown */}
              {showList && filtered.length > 0 && (
                <Card sx={{ position: 'absolute', zIndex: 10, width: '100%', mt: 0.5, maxHeight: 240, overflowY: 'auto' }}>
                  <List dense disablePadding>
                    {filtered.map(c => (
                      <ListItemButton key={c.id} selected={selectedCustomer?.id === c.id}
                        onClick={() => { setSelectedCustomer(c); setSearch(c.fullName); setShowList(false); }}>
                        <ListItemText
                          primary={c.fullName}
                          secondary={`${c.email} · ${c.phone}`}
                          primaryTypographyProps={{ fontSize: 14 }}
                          secondaryTypographyProps={{ fontSize: 12 }}
                        />
                        <Chip size="small" label={c.kycStatus} color="success" sx={{ ml: 1 }} />
                      </ListItemButton>
                    ))}
                  </List>
                </Card>
              )}
              {showList && <Box sx={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowList(false)} />}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Account details */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Step 2 — Account details</Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller name="accountType" control={control} render={({ field }) => (
              <TextField {...field} select label="Account type" error={!!errors.accountType} helperText={errors.accountType?.message}>
                {ACCOUNT_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
              </TextField>
            )} />

            <Controller name="initialDeposit" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Initial deposit (₹)"
                error={!!errors.initialDeposit} helperText={errors.initialDeposit?.message ?? 'Minimum ₹1,000'}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            )} />

            {selectedCustomer && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Opening for: <strong>{selectedCustomer.fullName}</strong> ({selectedCustomer.email})
              </Alert>
            )}

            <Button type="submit" variant="contained" size="large" disabled={!selectedCustomer || isSubmitting}>
              {isSubmitting ? 'Opening…' : 'Open Account'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
