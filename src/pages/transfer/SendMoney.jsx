// src/pages/transfer/SendMoney.jsx — MUI

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Box, Typography, Grid, TextField, MenuItem,
  Button, Alert, Card, CardContent, Stepper,
  Step, StepLabel, Chip, CircularProgress,
} from '@mui/material';
import SwapHorizIcon    from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import CancelIcon       from '@mui/icons-material/Cancel';
import toast from 'react-hot-toast';
import { sendMoneySchema } from '../../utils/validators';
import { rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import { getTransferType, validateMode } from '../../utils/transferRouter';
import { intrabankTransfer, initiateInterbankTransfer } from '../../services/transactionService';
import { getAllAccounts, getMyAccounts, getAccountByNumber } from '../../services/accountService';
import { getAllBanks } from '../../services/hubService';
import { hubDb } from '../../config/firebaseHub';
import { BANK_ID } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/ui';

const STEPS = ['Deducted from sender','Sent to hub','Processing at destination','Settled'];

export const SendMoney = () => {
  const { isCustomer, customerData } = useAuth();
  const [myAccounts, setMyAccounts]  = useState([]);
  const [banks,      setBanks]       = useState([]);
  const [transferId, setTransferId]  = useState(null);
  const [hubStatus,  setHubStatus]   = useState(null);
  const [submitting, setSubmitting]  = useState(false);

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(sendMoneySchema),
    defaultValues: { fromAccountId:'', toAccountNumber:'', toBankId: BANK_ID, amount:'', mode:'imps', remarks:'' },
  });

  const watchedBankId = watch('toBankId');
  const watchedAmount = watch('amount');
  const transferType  = getTransferType(watchedBankId);

  useEffect(() => {
    (async () => {
      const accs = isCustomer ? await getMyAccounts(customerData.uid) : await getAllAccounts();
      setMyAccounts(accs.filter(a => a.status === 'active'));
      const banks = await getAllBanks();
      setBanks([{ bankId: BANK_ID, bankName: `Same bank (${BANK_ID})` }, ...banks.filter(b => b.bankId !== BANK_ID)]);
    })();
  }, [isCustomer, customerData]);

  useEffect(() => {
    if (!transferId) return;
    const unsub = onSnapshot(doc(hubDb,'interbank_transfers',transferId), snap => {
      if (snap.exists()) setHubStatus(snap.data().status);
    });
    return unsub;
  }, [transferId]);

  const onSubmit = async (data) => {
    const amountPaise = rupeesToPaise(data.amount);
    const modeCheck   = validateMode(data.toBankId, data.mode);
    if (!modeCheck.valid) { toast.error(modeCheck.reason); return; }

    if (isCustomer && customerData?.transferLimitPaise && amountPaise > customerData.transferLimitPaise) {
      toast.error(`Transfer limit is ${paiseToRupees(customerData.transferLimitPaise)}`); return;
    }

    setSubmitting(true); setTransferId(null); setHubStatus(null);
    try {
      if (transferType === 'intrabank') {
        const toAcc = await getAccountByNumber(data.toAccountNumber);
        if (!toAcc) { toast.error('Recipient account not found.'); return; }
        const txnId = await intrabankTransfer({ fromAccountId: data.fromAccountId, toAccountId: toAcc.id, amountPaise, mode: 'internal', remarks: data.remarks });
        toast.success(`Transfer complete. TXN: ${txnId.slice(0,8)}…`);
        reset({ fromAccountId:'', toAccountNumber:'', toBankId: BANK_ID, amount:'', mode:'imps', remarks:'' });
      } else {
        const txnId = await initiateInterbankTransfer({ fromAccountId: data.fromAccountId, toAccountId: data.toAccountNumber, toBankId: data.toBankId, amountPaise, mode: data.mode, remarks: data.remarks });
        setTransferId(txnId);
        toast.success('Transfer initiated!', { duration: 3000 });
      }
    } catch (err) {
      toast.error(err.message ?? 'Transfer failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHorizIcon /> Send Money
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Form */}
        <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: 520 } }}>
          {myAccounts.length === 0 ? (
            <Alert severity="info">You have no active accounts to send from.</Alert>
          ) : (
            <Card>
              <CardContent>
                <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                  {/* From account */}
                  <Controller name="fromAccountId" control={control} render={({ field }) => (
                    <TextField {...field} select label="From account" error={!!errors.fromAccountId} helperText={errors.fromAccountId?.message}>
                      <MenuItem value="">— Select account —</MenuItem>
                      {myAccounts.map(a => (
                        <MenuItem key={a.id} value={a.id}>
                          ••••{a.accountNumber?.slice(-4)} — {paiseToRupees(a.balance)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )} />

                  {/* Destination bank */}
                  <Controller name="toBankId" control={control} render={({ field }) => (
                    <TextField {...field} select label="Destination bank" error={!!errors.toBankId} helperText={errors.toBankId?.message}>
                      <MenuItem value="">— Select bank —</MenuItem>
                      {banks.map(b => <MenuItem key={b.bankId} value={b.bankId}>{b.bankName}</MenuItem>)}
                    </TextField>
                  )} />

                  {/* Account number */}
                  <Controller name="toAccountNumber" control={control} render={({ field }) => (
                    <TextField {...field} label="Recipient account number" error={!!errors.toAccountNumber}
                      helperText={errors.toAccountNumber?.message ?? '8–18 digit account number'} />
                  )} />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Controller name="amount" control={control} render={({ field }) => (
                        <TextField {...field} type="number" label="Amount (₹)" error={!!errors.amount}
                          helperText={watchedAmount ? `= ${paiseToRupees(rupeesToPaise(watchedAmount))}` : errors.amount?.message} />
                      )} />
                    </Grid>
                    <Grid item xs={6}>
                      <Controller name="mode" control={control} render={({ field }) => (
                        <TextField {...field} select label="Mode" error={!!errors.mode} helperText={errors.mode?.message}>
                          {transferType === 'intrabank'
                            ? <MenuItem value="internal">Internal</MenuItem>
                            : [<MenuItem key="imps" value="imps">IMPS — Instant</MenuItem>, <MenuItem key="neft" value="neft">NEFT — Batch</MenuItem>]
                          }
                        </TextField>
                      )} />
                    </Grid>
                  </Grid>

                  {/* Remarks */}
                  <Controller name="remarks" control={control} render={({ field }) => (
                    <TextField {...field} label="Remarks (optional)" error={!!errors.remarks} helperText={errors.remarks?.message} />
                  )} />

                  <Button type="submit" variant="contained" size="large" disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SwapHorizIcon />}>
                    {submitting ? 'Processing…' : 'Send Money'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Live status tracker — sits to the right */}
        {transferId && (
          <Box sx={{ flex: '0 0 auto', width: 280, display: { xs: 'none', md: 'block' } }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" mb={2}>Transfer status</Typography>
                <Typography variant="caption" color="text.secondary" fontFamily="monospace" display="block" mb={2}>
                  ID: {transferId.slice(0, 20)}…
                </Typography>
                <Stepper activeStep={hubStatus === 'completed' ? 4 : hubStatus === 'failed' ? -1 : 2} orientation="vertical">
                  {STEPS.map((label, i) => (
                    <Step key={label}>
                      <StepLabel
                        error={hubStatus === 'failed' && i === 2}
                        icon={hubStatus === 'completed' && i === 3 ? <CheckCircleIcon color="success" /> : undefined}
                      >
                        <Typography variant="body2">{label}</Typography>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
                {hubStatus === 'failed' && (
                  <Alert severity="error" sx={{ mt: 2 }}>Transfer failed at destination. Contact support.</Alert>
                )}
                {hubStatus === 'completed' && (
                  <Alert severity="success" sx={{ mt: 2 }}>Transfer completed successfully!</Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Mobile: status below form */}
        {transferId && (
          <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%' }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" mb={2}>Transfer status</Typography>
                <Typography variant="caption" color="text.secondary" fontFamily="monospace" display="block" mb={2}>
                  ID: {transferId.slice(0, 20)}…
                </Typography>
                <Stepper activeStep={hubStatus === 'completed' ? 4 : hubStatus === 'failed' ? -1 : 2} orientation="vertical">
                  {STEPS.map((label, i) => (
                    <Step key={label}>
                      <StepLabel
                        error={hubStatus === 'failed' && i === 2}
                        icon={hubStatus === 'completed' && i === 3 ? <CheckCircleIcon color="success" /> : undefined}
                      >
                        <Typography variant="body2">{label}</Typography>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
                {hubStatus === 'failed' && (
                  <Alert severity="error" sx={{ mt: 2 }}>Transfer failed at destination. Contact support.</Alert>
                )}
                {hubStatus === 'completed' && (
                  <Alert severity="success" sx={{ mt: 2 }}>Transfer completed successfully!</Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
};
