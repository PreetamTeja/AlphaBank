// src/pages/Dashboard.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Box, Typography, Button, Alert,
  List, ListItem, ListItemText, Divider,
} from '@mui/material';
import SwapHorizIcon      from '@mui/icons-material/SwapHoriz';
import CreditCardIcon     from '@mui/icons-material/CreditCard';
import HistoryIcon        from '@mui/icons-material/History';
import TrendingUpIcon     from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowDownwardIcon  from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon    from '@mui/icons-material/ArrowUpward';
import AddIcon            from '@mui/icons-material/Add';
import { useAuth }        from '../context/AuthContext';
import { getAllAccounts, getMyAccounts } from '../services/accountService';
import { getAllTransactions, getTransactionsByAccount } from '../services/transactionService';
import { paiseToRupees, formatDate } from '../utils/formatters';
import { BANK_NAME } from '../config/constants';
import { StatCard, Card, LoadingSpinner, StatusChip } from '../components/ui';

const KYC_ALERTS = {
  not_submitted: { severity: 'info',    title: 'Complete your KYC',    body: 'Submit your identity documents to activate your account.', cta: 'Submit KYC', to: '/kyc' },
  pending:       { severity: 'warning', title: 'KYC under review',     body: 'Your documents are being reviewed. We will notify you within 1–2 business days.', cta: 'View status', to: '/kyc' },
  hold:          { severity: 'warning', title: 'KYC on hold',          body: 'Additional information required. Please check your KYC page.', cta: 'View status', to: '/kyc' },
  rejected:      { severity: 'error',   title: 'KYC rejected',         body: 'Your KYC was rejected. Please resubmit with correct documents.', cta: 'Resubmit', to: '/kyc' },
};

export const Dashboard = () => {
  const { isCustomer, isStaff, customerData, displayName, kycStatus } = useAuth();
  const navigate = useNavigate();
  const [accounts,     setAccounts]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (isCustomer && kycStatus === 'approved') {
          const accs = await getMyAccounts(customerData.uid);
          setAccounts(accs);
          if (accs.length > 0) {
            const map = new Map();
            (await Promise.all(accs.map(a => getTransactionsByAccount(a.id)))).flat()
              .forEach(t => map.set(t.id, t));
            setTransactions(
              [...map.values()]
                .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
                .slice(0, 10)
            );
          }
        } else if (isStaff) {
          const [accs, txns] = await Promise.all([getAllAccounts(), getAllTransactions()]);
          setAccounts(accs);
          setTransactions(txns.slice(0, 10));
        }
      } finally { setLoading(false); }
    })();
  }, [isCustomer, isStaff, customerData, kycStatus]);

  if (loading) return <LoadingSpinner message="Loading dashboard…" />;

  const totalBalance   = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const pendingTxns    = transactions.filter(t => t.status === 'pending').length;
  const alert          = isCustomer ? KYC_ALERTS[kycStatus] : null;
  const hour           = new Date().getHours();
  const greeting       = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5">{greeting}, {displayName.split(' ')[0]}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {BANK_NAME}
          </Typography>
        </Box>

        {(isStaff || kycStatus === 'approved') && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" color="primary" size="small" startIcon={<SwapHorizIcon />} onClick={() => navigate('/send-money')}>
              Send Money
            </Button>
            <Button variant="outlined" color="secondary" size="small" startIcon={<HistoryIcon />} onClick={() => navigate('/transactions')}>
              History
            </Button>
            {isStaff && (
              <Button variant="outlined" color="secondary" size="small" startIcon={<AddIcon />} onClick={() => navigate('/accounts/new')}>
                Open Account
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* KYC alert */}
      {alert && (
        <Alert
          severity={alert.severity}
          action={
            <Button size="small" color="inherit" onClick={() => navigate(alert.to)} variant="text">
              {alert.cta}
            </Button>
          }
        >
          <strong>{alert.title}</strong> &mdash; {alert.body}
        </Alert>
      )}

      {/* Stats row */}
      {(isStaff || kycStatus === 'approved') && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <StatCard
                label="Total Balance"
                value={paiseToRupees(totalBalance)}
                icon={TrendingUpIcon}
                color="#E22026"
                trendLabel="Across all accounts"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                label="Active Accounts"
                value={activeAccounts}
                icon={CreditCardIcon}
                color="#003E8A"
                trendLabel={`${accounts.length} total`}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                label="Transactions"
                value={transactions.length}
                icon={HistoryIcon}
                color="#1B7E47"
                trendLabel="Recent activity"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                label="Pending"
                value={pendingTxns}
                icon={AccountBalanceIcon}
                color={pendingTxns > 0 ? '#B25E00' : '#1B7E47'}
                trend={pendingTxns === 0 ? 1 : -1}
                trendLabel={pendingTxns > 0 ? 'Needs review' : 'All clear'}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2.5}>
            {/* Recent Transactions */}
            <Grid item xs={12} md={7}>
              <Card
                title="Recent Transfers"
                action={
                  <Button size="small" variant="text" color="secondary" onClick={() => navigate('/transactions')}>
                    View all
                  </Button>
                }
              >
                {transactions.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No transfers yet.</Typography>
                  </Box>
                ) : (
                  <List dense disablePadding>
                    {transactions.slice(0, 8).map((txn, i) => {
                      const isCredit = txn.direction === 'credit';
                      return (
                        <Box key={txn.id}>
                          <ListItem disablePadding sx={{ py: 1.25 }}>
                            <Box sx={{
                              width: 32, height: 32,
                              bgcolor: isCredit ? 'success.light' : 'error.light',
                              borderRadius: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              mr: 1.5, flexShrink: 0,
                            }}>
                              {isCredit
                                ? <ArrowDownwardIcon sx={{ fontSize: 15, color: 'success.main' }} />
                                : <ArrowUpwardIcon   sx={{ fontSize: 15, color: 'error.main'   }} />}
                            </Box>
                            <ListItemText
                              primary={
                                txn.type === 'intrabank_transfer'
                                  ? 'Internal Transfer'
                                  : `${txn.mode?.toUpperCase()} · ${isCredit ? txn.fromBankId : txn.toBankId}`
                              }
                              secondary={formatDate(txn.createdAt)}
                              primaryTypographyProps={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}
                              secondaryTypographyProps={{ fontSize: 11 }}
                            />
                            <Box sx={{ textAlign: 'right', ml: 1, flexShrink: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                sx={{ color: isCredit ? 'success.main' : 'error.main', fontSize: 13 }}
                              >
                                {isCredit ? '+' : '−'}{paiseToRupees(txn.amount)}
                              </Typography>
                              <StatusChip status={txn.status} />
                            </Box>
                          </ListItem>
                          {i < Math.min(transactions.length, 8) - 1 && <Divider />}
                        </Box>
                      );
                    })}
                  </List>
                )}
              </Card>
            </Grid>

            {/* Accounts */}
            <Grid item xs={12} md={5}>
              <Card
                title={isCustomer ? 'My Accounts' : 'Accounts'}
                action={
                  isStaff
                    ? <Button size="small" variant="text" color="secondary" onClick={() => navigate('/accounts')}>Manage</Button>
                    : null
                }
              >
                {accounts.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {isCustomer
                        ? 'Your account will appear here once opened by the bank.'
                        : 'No accounts yet.'}
                    </Typography>
                  </Box>
                ) : (
                  <List dense disablePadding>
                    {accounts.slice(0, 5).map((acc, i) => (
                      <Box key={acc.id}>
                        <ListItem
                          disablePadding
                          sx={{
                            py: 1.25,
                            cursor: isStaff ? 'pointer' : 'default',
                            '&:hover': isStaff ? { bgcolor: 'grey.50' } : {},
                            borderRadius: 1,
                          }}
                          onClick={() => isStaff && navigate(`/accounts/${acc.id}`)}
                        >
                          <Box sx={{
                            width: 32, height: 32,
                            bgcolor: 'secondary.light',
                            borderRadius: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mr: 1.5, flexShrink: 0,
                          }}>
                            <CreditCardIcon sx={{ fontSize: 15, color: 'secondary.main' }} />
                          </Box>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={600} fontFamily="monospace" fontSize={12} color="text.primary">
                                {isCustomer ? acc.accountNumber : `••••${acc.accountNumber?.slice(-4)}`}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {acc.accountType} &middot; {acc.ifscCode}
                                {isStaff && ` · ${acc.customerName}`}
                              </Typography>
                            }
                          />
                          <Box sx={{ textAlign: 'right', ml: 1, flexShrink: 0 }}>
                            <Typography variant="body2" fontWeight={700} fontSize={13} color="text.primary">
                              {paiseToRupees(acc.balance)}
                            </Typography>
                            <StatusChip status={acc.status} />
                          </Box>
                        </ListItem>
                        {i < accounts.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                )}
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};
