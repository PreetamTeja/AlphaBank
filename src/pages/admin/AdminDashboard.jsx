// src/pages/admin/AdminDashboard.jsx

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp, getDocs, collection, query, where } from 'firebase/firestore';
import {
  Box, Typography, Grid, Card, CardContent, TextField, MenuItem,
  Button, Alert, Chip, Divider, List, ListItem, ListItemText,
  Avatar, Collapse, Tab, Tabs, CircularProgress,
} from '@mui/material';
import SettingsIcon    from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon      from '@mui/icons-material/Cancel';
import PauseIcon       from '@mui/icons-material/Pause';
import ExpandMoreIcon  from '@mui/icons-material/ExpandMore';
import ExpandLessIcon  from '@mui/icons-material/ExpandLess';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SyncIcon        from '@mui/icons-material/Sync';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import toast from 'react-hot-toast';
import { privateAuth, privateDb } from '../../config/firebasePrivate';
import { addStaffSchema } from '../../utils/validators';
import { BANK_ID } from '../../config/constants';
import { StatCard, LoadingSpinner } from '../../components/ui';
import { getAllAccounts, getAllCustomers } from '../../services/accountService';
import { getAllTransactions } from '../../services/transactionService';
import { getPendingKYC, getHoldKYC, getApprovedKYC, approveKYC, holdKYC, rejectKYC } from '../../services/kycService';
import { getPendingLoans, getHoldLoans, approveLoan, holdLoan, rejectLoan } from '../../services/loanService';
import { registerBankInHub } from '../../services/hubService';
import { paiseToRupees, rupeesToPaise, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

// Section wrapper matching HDFC card style
const Section = ({ title, children }) => (
  <Card>
    <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
    </Box>
    <CardContent>{children}</CardContent>
  </Card>
);

// Expandable item row
const ItemRow = ({ primary, secondary, badge, expanded, onToggle, children }) => (
  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1, overflow: 'hidden' }}>
    <Box
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.5, cursor: 'pointer', bgcolor: '#fff',
        '&:hover': { bgcolor: 'grey.50' },
      }}
      onClick={onToggle}
    >
      <Box>
        <Typography variant="body2" fontWeight={500}>{primary}</Typography>
        <Typography variant="caption" color="text.secondary">{secondary}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {badge}
        {expanded ? <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
      </Box>
    </Box>
    <Collapse in={expanded}>
      <Divider />
      <Box sx={{ px: 2, py: 2, bgcolor: 'grey.50' }}>{children}</Box>
    </Collapse>
  </Box>
);

// Reason input + confirm / cancel buttons
const ReasonForm = ({ label, confirmColor, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
      <TextField
        size="small" fullWidth
        placeholder={label}
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant="contained" color={confirmColor} onClick={() => onConfirm(reason)}>
          Confirm
        </Button>
        <Button size="small" variant="outlined" onClick={onCancel}>Cancel</Button>
      </Box>
    </Box>
  );
};

export const AdminDashboard = () => {
  const { staffData } = useAuth();
  const [staff,        setStaff]        = useState([]);
  const [kycData,      setKycData]      = useState({ pending: [], hold: [], approved: [] });
  const [loanData,     setLoanData]     = useState({ pending: [], hold: [] });
  const [customers,    setCustomers]    = useState([]);
  const [stats,        setStats]        = useState({ accounts: 0, txns: 0 });
  const [loading,      setLoading]      = useState(true);
  const [kycTab,       setKycTab]       = useState(0);
  const [loanTab,      setLoanTab]      = useState(0);
  const [expandedKyc,  setExpandedKyc]  = useState(null);
  const [expandedLoan, setExpandedLoan] = useState(null);
  const [kycAction,    setKycAction]    = useState(null); // { id, type: 'hold'|'reject' }
  const [loanAction,   setLoanAction]   = useState(null); // { id, type: 'hold'|'reject' }
  const [limitTarget,  setLimitTarget]  = useState(null);
  const [limitValue,   setLimitValue]   = useState('');

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(addStaffSchema),
    defaultValues: { name: '', email: '', password: '', role: 'teller' },
  });

  const load = async () => {
    const [staffSnap, accs, txns, kPending, kHold, kApproved, lPending, lHold, custs] = await Promise.all([
      getDocs(query(collection(privateDb, 'staff'), where('bankId', '==', BANK_ID))),
      getAllAccounts(), getAllTransactions(),
      getPendingKYC(), getHoldKYC(), getApprovedKYC(),
      getPendingLoans(), getHoldLoans(), getAllCustomers(),
    ]);
    setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setStats({ accounts: accs.length, txns: txns.length });
    setKycData({ pending: kPending, hold: kHold, approved: kApproved });
    setLoanData({ pending: lPending, hold: lHold });
    setCustomers(custs);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const getEmail = (cid) => customers.find(c => c.id === cid)?.email ?? '';

  // KYC handlers
  const handleKycApprove = async (kyc) => {
    try {
      await approveKYC(kyc.customerId, staffData.uid, getEmail(kyc.customerId), kyc.fullName);
      toast.success(`KYC approved for ${kyc.fullName}.`);
      await load();
    } catch (err) { toast.error(err.message); }
  };
  const handleKycHold = async (kyc, reason) => {
    if (!reason?.trim()) { toast.error('Enter a reason.'); return; }
    try {
      await holdKYC(kyc.customerId, staffData.uid, reason, getEmail(kyc.customerId), kyc.fullName);
      toast.success(`KYC put on hold for ${kyc.fullName}.`);
      setKycAction(null); await load();
    } catch (err) { toast.error(err.message); }
  };
  const handleKycReject = async (kyc, reason) => {
    if (!reason?.trim()) { toast.error('Enter a reason.'); return; }
    try {
      await rejectKYC(kyc.customerId, staffData.uid, reason, getEmail(kyc.customerId), kyc.fullName);
      toast.success(`KYC rejected for ${kyc.fullName}.`);
      setKycAction(null); await load();
    } catch (err) { toast.error(err.message); }
  };

  // Loan handlers
  const handleLoanApprove = async (loan) => {
    try {
      await approveLoan(loan.id, staffData.uid);
      toast.success('Loan approved.');
      await load();
    } catch (err) { toast.error(err.message); }
  };
  const handleLoanHold = async (loan, reason) => {
    if (!reason?.trim()) { toast.error('Enter a reason.'); return; }
    try {
      await holdLoan(loan.id, staffData.uid, reason);
      toast.success('Loan put on hold.');
      setLoanAction(null); await load();
    } catch (err) { toast.error(err.message); }
  };
  const handleLoanReject = async (loan, reason) => {
    if (!reason?.trim()) { toast.error('Enter a reason.'); return; }
    try {
      await rejectLoan(loan.id, staffData.uid, reason);
      toast.success('Loan rejected.');
      setLoanAction(null); await load();
    } catch (err) { toast.error(err.message); }
  };

  const setLimit = async (cid) => {
    const p = rupeesToPaise(limitValue);
    if (!p || p <= 0) { toast.error('Enter a valid amount.'); return; }
    try {
      await updateDoc(doc(privateDb, 'customers', cid), { transferLimitPaise: p, updatedAt: serverTimestamp() });
      toast.success(`Limit set to ${paiseToRupees(p)}`);
      setLimitTarget(null); setLimitValue('');
      setCustomers(prev => prev.map(c => c.id === cid ? { ...c, transferLimitPaise: p } : c));
    } catch (err) { toast.error(err.message); }
  };

  const addStaff = async (data) => {
    try {
      const cred = await createUserWithEmailAndPassword(privateAuth, data.email, data.password);
      await setDoc(doc(privateDb, 'staff', cred.user.uid), {
        uid: cred.user.uid, name: data.name, email: data.email, role: data.role,
        bankId: BANK_ID, isActive: true, createdAt: serverTimestamp(),
      });
      toast.success(`${data.name} added as ${data.role}.`);
      setStaff(p => [...p, { id: cred.user.uid, ...data, isActive: true }]);
      reset();
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <LoadingSpinner />;

  const KYC_TABS  = ['pending', 'hold', 'approved'];
  const LOAN_TABS = ['pending', 'hold'];
  const currentKYC  = kycData[KYC_TABS[kycTab]]   ?? [];
  const currentLoan = loanData[LOAN_TABS[loanTab]] ?? [];

  const statusColor = { pending: 'warning', hold: 'warning', approved: 'success', rejected: 'error' };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="h5">Admin Dashboard</Typography>

      {/* Stats */}
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}><StatCard label="Accounts"      value={stats.accounts}         icon={SettingsIcon} /></Grid>
        <Grid item xs={6} md={3}><StatCard label="Transactions"  value={stats.txns}             icon={SettingsIcon} /></Grid>
        <Grid item xs={6} md={3}><StatCard label="Pending KYC"   value={kycData.pending.length} icon={SettingsIcon} /></Grid>
        <Grid item xs={6} md={3}><StatCard label="Pending Loans" value={loanData.pending.length} icon={SettingsIcon} /></Grid>
      </Grid>

      {/* KYC Management */}
      <Section title="KYC Management">
        <Tabs value={kycTab} onChange={(_, v) => setKycTab(v)} sx={{ mb: 2, mt: -1 }}>
          {KYC_TABS.map(t => (
            <Tab key={t} label={`${t.charAt(0).toUpperCase() + t.slice(1)} (${kycData[t]?.length ?? 0})`} />
          ))}
        </Tabs>

        {currentKYC.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
            No {KYC_TABS[kycTab]} KYC requests.
          </Typography>
        ) : currentKYC.map(kyc => (
          <ItemRow
            key={kyc.id}
            primary={kyc.fullName}
            secondary={`Submitted: ${formatDate(kyc.submittedAt)}`}
            badge={<Chip size="small" color={statusColor[kyc.status] ?? 'default'} label={kyc.status} sx={{ textTransform: 'capitalize' }} />}
            expanded={expandedKyc === kyc.id}
            onToggle={() => setExpandedKyc(expandedKyc === kyc.id ? null : kyc.id)}
          >
            <Grid container spacing={1} mb={1.5}>
              {[['PAN', kyc.pan], ['Aadhaar', `••••••••${kyc.aadhaarLast4}`], ['DOB', kyc.dob], ['Doc type', kyc.docType?.replace('_', ' ')], ['Address', kyc.address]].map(([l, v]) => (
                <Grid item xs={6} key={l}>
                  <Typography variant="caption" color="text.secondary" display="block">{l}</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>{v}</Typography>
                </Grid>
              ))}
              {kyc.holdReason && (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ py: 0.5 }}>Hold reason: {kyc.holdReason}</Alert>
                </Grid>
              )}
            </Grid>

            {kycAction?.id === kyc.id ? (
              <ReasonForm
                label={kycAction.type === 'hold' ? 'Reason for hold…' : 'Reason for rejection…'}
                confirmColor={kycAction.type === 'hold' ? 'warning' : 'error'}
                onConfirm={reason => kycAction.type === 'hold' ? handleKycHold(kyc, reason) : handleKycReject(kyc, reason)}
                onCancel={() => setKycAction(null)}
              />
            ) : kycTab !== 2 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleKycApprove(kyc)}>Approve</Button>
                <Button size="small" variant="outlined"  color="warning" startIcon={<PauseIcon />}       onClick={() => setKycAction({ id: kyc.id, type: 'hold' })}>Hold</Button>
                <Button size="small" variant="outlined"  color="error"   startIcon={<CancelIcon />}      onClick={() => setKycAction({ id: kyc.id, type: 'reject' })}>Reject</Button>
              </Box>
            )}
            {kycTab === 2 && (
              <Button size="small" variant="outlined" color="secondary" href="/accounts/new">Open account for customer</Button>
            )}
          </ItemRow>
        ))}
      </Section>

      {/* Loan Management */}
      <Section title="Loan Management">
        <Tabs value={loanTab} onChange={(_, v) => setLoanTab(v)} sx={{ mb: 2, mt: -1 }}>
          {LOAN_TABS.map(t => (
            <Tab key={t} label={`${t.charAt(0).toUpperCase() + t.slice(1)} (${loanData[t]?.length ?? 0})`} />
          ))}
        </Tabs>

        {currentLoan.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
            No {LOAN_TABS[loanTab]} loans.
          </Typography>
        ) : currentLoan.map(loan => (
          <ItemRow
            key={loan.id}
            primary={`${loan.loanType?.replace('_', ' ')} — ${paiseToRupees(loan.amountPaise)}`}
            secondary={`${loan.durationMonths} months · EMI ${paiseToRupees(loan.emiPaise)} · Applied: ${formatDate(loan.appliedAt)}`}
            badge={<Chip size="small" color={statusColor[loan.status] ?? 'default'} label={loan.status} sx={{ textTransform: 'capitalize' }} />}
            expanded={expandedLoan === loan.id}
            onToggle={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}
          >
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="body2"><strong>Purpose:</strong> {loan.purpose}</Typography>
              <Typography variant="body2"><strong>Interest:</strong> {loan.interestRate}% p.a.</Typography>
              {loan.holdReason && (
                <Alert severity="warning" sx={{ py: 0.5, mt: 1 }}>Hold reason: {loan.holdReason}</Alert>
              )}
            </Box>

            {loanAction?.id === loan.id ? (
              <ReasonForm
                label={loanAction.type === 'hold' ? 'Reason for hold…' : 'Reason for rejection…'}
                confirmColor={loanAction.type === 'hold' ? 'warning' : 'error'}
                onConfirm={reason => loanAction.type === 'hold' ? handleLoanHold(loan, reason) : handleLoanReject(loan, reason)}
                onCancel={() => setLoanAction(null)}
              />
            ) : (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleLoanApprove(loan)}>Approve</Button>
                <Button size="small" variant="outlined"  color="warning" startIcon={<PauseIcon />}       onClick={() => setLoanAction({ id: loan.id, type: 'hold' })}>Hold</Button>
                <Button size="small" variant="outlined"  color="error"   startIcon={<CancelIcon />}      onClick={() => setLoanAction({ id: loan.id, type: 'reject' })}>Reject</Button>
              </Box>
            )}
          </ItemRow>
        ))}
      </Section>

      {/* Transfer Limits */}
      <Section title="Customer Transfer Limits">
        {customers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No customers yet.</Typography>
        ) : (
          <List dense disablePadding>
            {customers.map((c, i) => (
              <Box key={c.id}>
                <ListItem disablePadding sx={{ py: 1 }}>
                  <Avatar sx={{ width: 30, height: 30, mr: 1.5, fontSize: 13 }}>
                    {c.fullName?.charAt(0)}
                  </Avatar>
                  <ListItemText
                    primary={c.fullName}
                    secondary={`Limit: ${c.transferLimitPaise ? paiseToRupees(c.transferLimitPaise) : 'Not set'}`}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                  />
                  {limitTarget === c.id ? (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField size="small" type="number" placeholder="₹ amount" value={limitValue}
                        onChange={e => setLimitValue(e.target.value)} sx={{ width: 110 }} />
                      <Button size="small" variant="contained" onClick={() => setLimit(c.id)}>Set</Button>
                      <Button size="small" variant="outlined" onClick={() => setLimitTarget(null)}>✕</Button>
                    </Box>
                  ) : (
                    <Button size="small" variant="outlined" color="secondary" startIcon={<AttachMoneyIcon />}
                      onClick={() => { setLimitTarget(c.id); setLimitValue(''); }}>
                      Set limit
                    </Button>
                  )}
                </ListItem>
                {i < customers.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Section>

      {/* Hub sync */}
      <Section title="Hub Registration">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Register or refresh this bank in the shared inter-bank hub.
        </Typography>
        <Button variant="outlined" color="secondary" startIcon={<SyncIcon />}
          onClick={async () => {
            try { await registerBankInHub(); toast.success('Synced!'); }
            catch { toast.error('Sync failed.'); }
          }}>
          Sync bank to hub
        </Button>
      </Section>

      <Grid container spacing={2.5}>
        {/* Add staff */}
        <Grid item xs={12} md={6}>
          <Section title="Add Staff Member">
            <Box component="form" onSubmit={handleSubmit(addStaff)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Controller name="name"     control={control} render={({ field }) => (<TextField {...field} label="Full name"  error={!!errors.name}     helperText={errors.name?.message} />)} />
              <Controller name="email"    control={control} render={({ field }) => (<TextField {...field} label="Email"      type="email" error={!!errors.email}    helperText={errors.email?.message} />)} />
              <Controller name="password" control={control} render={({ field }) => (<TextField {...field} label="Password"   type="password" error={!!errors.password} helperText={errors.password?.message} />)} />
              <Controller name="role"     control={control} render={({ field }) => (
                <TextField {...field} select label="Role" error={!!errors.role} helperText={errors.role?.message}>
                  {['teller', 'manager', 'admin'].map(r => <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>)}
                </TextField>
              )} />
              <Button type="submit" variant="contained" disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : null}>
                {isSubmitting ? 'Adding…' : 'Add staff member'}
              </Button>
            </Box>
          </Section>
        </Grid>

        {/* Staff list */}
        <Grid item xs={12} md={6}>
          <Section title="Current Staff">
            {staff.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No staff yet.</Typography>
            ) : (
              <List dense disablePadding>
                {staff.map((s, i) => (
                  <Box key={s.id}>
                    <ListItem disablePadding sx={{ py: 1 }}>
                      <Avatar sx={{ width: 30, height: 30, mr: 1.5, fontSize: 13 }}>{s.name?.charAt(0)}</Avatar>
                      <ListItemText
                        primary={s.name}
                        secondary={s.email}
                        primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip size="small" label={s.role} color="secondary" sx={{ textTransform: 'capitalize' }} />
                        <Chip size="small" label={s.isActive ? 'active' : 'inactive'} color={s.isActive ? 'success' : 'default'} />
                      </Box>
                    </ListItem>
                    {i < staff.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Section>
        </Grid>
      </Grid>
    </Box>
  );
};
