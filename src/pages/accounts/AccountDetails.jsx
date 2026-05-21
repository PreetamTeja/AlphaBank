// src/pages/accounts/AccountDetails.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent,
  List, ListItem, ListItemText, Divider, Grid, Alert,
  TextField, Collapse,
} from '@mui/material';
import ArrowBackIcon     from '@mui/icons-material/ArrowBack';
import SwapHorizIcon     from '@mui/icons-material/SwapHoriz';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward';
import AcUnitIcon        from '@mui/icons-material/AcUnit';
import LockOpenIcon      from '@mui/icons-material/LockOpen';
import AddCircleIcon     from '@mui/icons-material/AddCircle';
import toast from 'react-hot-toast';
import { getAccount, updateAccountStatus, depositToAccount } from '../../services/accountService';
import { getTransactionsByAccount } from '../../services/transactionService';
import { paiseToRupees, formatDate, rupeesToPaise } from '../../utils/formatters';
import { LoadingSpinner, StatusChip } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export const AccountDetails = () => {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { isManager, isStaff, staffData } = useAuth();
  const [account,      setAccount]      = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toggling,     setToggling]     = useState(false);
  const [showDeposit,  setShowDeposit]  = useState(false);
  const [depositAmt,   setDepositAmt]   = useState('');
  const [depositNote,  setDepositNote]  = useState('');
  const [depositing,   setDepositing]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [acc, txns] = await Promise.all([getAccount(id), getTransactionsByAccount(id)]);
        setAccount(acc);
        setTransactions(txns);
      } catch (err) { toast.error(err.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const toggleStatus = async () => {
    if (!account) return;
    const next = account.status === 'active' ? 'frozen' : 'active';
    setToggling(true);
    try {
      await updateAccountStatus(id, next);
      setAccount(a => ({ ...a, status: next }));
      toast.success(`Account ${next === 'active' ? 'unfrozen' : 'frozen'}.`);
    } catch (err) { toast.error(err.message); }
    finally { setToggling(false); }
  };

  const handleDeposit = async () => {
    const paise = rupeesToPaise(depositAmt);
    if (!paise || paise <= 0) { toast.error('Enter a valid amount.'); return; }
    setDepositing(true);
    try {
      await depositToAccount(id, paise, staffData?.uid ?? 'staff', depositNote);
      toast.success(`₹${depositAmt} deposited successfully.`);
      // Refresh account balance and transactions
      const [acc, txns] = await Promise.all([getAccount(id), getTransactionsByAccount(id)]);
      setAccount(acc); setTransactions(txns);
      setDepositAmt(''); setDepositNote(''); setShowDeposit(false);
    } catch (err) { toast.error(err.message); }
    finally { setDepositing(false); }
  };

  if (loading)  return <LoadingSpinner message="Loading account…" />;
  if (!account) return <Alert severity="error">Account not found.</Alert>;

  return (
    <Box sx={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/accounts')} size="small" variant="text" color="secondary">
          Back
        </Button>
        <Typography variant="h5" sx={{ ml: 0.5 }}>Account Details</Typography>
      </Box>

      {/* Account hero card */}
      <Card sx={{ bgcolor: 'secondary.main', color: '#fff', border: 'none' }}>
        <CardContent>
          <Grid container justifyContent="space-between" alignItems="flex-start">
            <Grid item>
              <Typography variant="caption" sx={{ opacity: 0.65, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Account Number
              </Typography>
              <Typography variant="h5" fontFamily="monospace" fontWeight={700} mt={0.5} letterSpacing="0.04em">
                {account.accountNumber}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.65 }}>{account.ifscCode}</Typography>
            </Grid>
            <Grid item sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ opacity: 0.65, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Balance
              </Typography>
              <Typography variant="h4" fontWeight={700} mt={0.5}>{paiseToRupees(account.balance)}</Typography>
              <StatusChip status={account.status} />
            </Grid>
          </Grid>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 2 }} />
          <Grid container spacing={3}>
            {[['Type', account.accountType], ['Customer', account.customerName], ['Opened', formatDate(account.createdAt)]].map(([l, v]) => (
              <Grid item xs={4} key={l}>
                <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                  {l}
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize', mt: 0.5, color: '#fff' }}>
                  {v}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SwapHorizIcon />}
          onClick={() => navigate('/send-money')}
          size="small"
        >
          Send Money
        </Button>

        {isStaff && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AddCircleIcon />}
            onClick={() => setShowDeposit(v => !v)}
            size="small"
          >
            {showDeposit ? 'Cancel Deposit' : 'Deposit Cash'}
          </Button>
        )}

        {isManager && (
          <Button
            variant="outlined"
            color={account.status === 'active' ? 'error' : 'success'}
            startIcon={account.status === 'active' ? <AcUnitIcon /> : <LockOpenIcon />}
            disabled={toggling}
            onClick={toggleStatus}
            size="small"
          >
            {toggling ? 'Updating…' : account.status === 'active' ? 'Freeze Account' : 'Unfreeze Account'}
          </Button>
        )}
      </Box>

      {/* Deposit panel */}
      <Collapse in={showDeposit}>
        <Card>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2">Cash Deposit</Typography>
          </Box>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
              <TextField
                label="Amount (₹)"
                type="number"
                value={depositAmt}
                onChange={e => setDepositAmt(e.target.value)}
                inputProps={{ min: 1 }}
                size="small"
              />
              <TextField
                label="Remarks (optional)"
                value={depositNote}
                onChange={e => setDepositNote(e.target.value)}
                size="small"
                placeholder="e.g. Cash deposit at branch"
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  disabled={depositing || !depositAmt}
                  onClick={handleDeposit}
                >
                  {depositing ? 'Processing…' : 'Confirm Deposit'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => { setShowDeposit(false); setDepositAmt(''); setDepositNote(''); }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Collapse>

      {/* Transactions */}
      <Card>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2">Transactions ({transactions.length})</Typography>
        </Box>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {transactions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No transactions on this account.
            </Typography>
          ) : (
            <List dense disablePadding>
              {transactions.map((txn, i) => (
                <Box key={txn.id}>
                  <ListItem disablePadding sx={{ px: 2.5, py: 1.25 }}>
                    <Box sx={{
                      width: 30, height: 30, borderRadius: 1,
                      bgcolor: txn.direction === 'credit' ? 'success.light' : 'error.light',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mr: 1.5, flexShrink: 0,
                    }}>
                      {txn.direction === 'credit'
                        ? <ArrowDownwardIcon sx={{ color: 'success.main', fontSize: 15 }} />
                        : <ArrowUpwardIcon   sx={{ color: 'error.main',   fontSize: 15 }} />}
                    </Box>
                    <ListItemText
                      primary={
                        txn.type === 'deposit' ? `Cash Deposit${txn.remarks ? ` — ${txn.remarks}` : ''}`
                        : txn.type === 'intrabank_transfer' ? 'Internal Transfer'
                        : `${txn.mode?.toUpperCase()} · ${txn.direction === 'credit' ? txn.fromBankId : txn.toBankId}`
                      }
                      secondary={formatDate(txn.createdAt)}
                      primaryTypographyProps={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}
                      secondaryTypographyProps={{ fontSize: 11 }}
                    />
                    <Box sx={{ textAlign: 'right', ml: 1, flexShrink: 0 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: txn.direction === 'credit' ? 'success.main' : 'error.main', fontSize: 13 }}>
                        {txn.direction === 'credit' ? '+' : '−'}{paiseToRupees(txn.amount)}
                      </Typography>
                      <StatusChip status={txn.status} />
                    </Box>
                  </ListItem>
                  {i < transactions.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
