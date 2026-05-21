// src/pages/transactions/TransactionHistory.jsx

import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  ToggleButtonGroup, ToggleButton, Button,
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Alert, Tooltip, Chip,
} from '@mui/material';
import HistoryIcon       from '@mui/icons-material/History';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward';
import UndoIcon          from '@mui/icons-material/Undo';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  getAllTransactions, getTransactionsByAccount,
  rollbackTransaction,
} from '../../services/transactionService';
import { getMyAccounts } from '../../services/accountService';
import { getAllBanks }    from '../../services/hubService';
import { paiseToRupees, formatDate, modeLabel } from '../../utils/formatters';
import { LoadingSpinner, StatusChip } from '../../components/ui';
import { BANK_ID, BANK_NAME } from '../../config/constants';

const FILTERS = ['all', 'credit', 'debit', 'pending', 'failed', 'interbank'];

// A transaction is eligible for rollback if it is an interbank debit
// that is still pending or failed (money left sender but never reached recipient).
const isRollbackEligible = (txn) =>
  txn.type === 'interbank_transfer' &&
  txn.direction === 'debit' &&
  (txn.status === 'pending' || txn.status === 'failed');

export const TransactionHistory = () => {
  const { isCustomer, isStaff, customerData, staffData } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [bankMap,      setBankMap]      = useState({});
  const [filter,       setFilter]       = useState('all');
  const [loading,      setLoading]      = useState(true);
  // Single rollback
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [rolling,        setRolling]        = useState(false);
  // Bulk rollback
  const [rollbackAllOpen,     setRollbackAllOpen]     = useState(false);
  const [rollingAll,          setRollingAll]          = useState(false);
  const [rollbackAllProgress, setRollbackAllProgress] = useState(null); // {done, total}

  const loadTransactions = useCallback(async () => {
    const banks = await getAllBanks();
    const map   = { [BANK_ID]: BANK_NAME };
    banks.forEach(b => { map[b.bankId] = b.bankName ?? b.bankId; });
    setBankMap(map);

    if (isCustomer) {
      const accs = await getMyAccounts(customerData.uid);
      if (accs.length > 0) {
        const seen = new Map();
        (await Promise.all(accs.map(a => getTransactionsByAccount(a.id))))
          .flat()
          .forEach(t => seen.set(t.id, t));
        setTransactions(
          [...seen.values()].sort((a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
          )
        );
      }
    } else {
      setTransactions(await getAllTransactions());
    }
  }, [isCustomer, customerData]);

  useEffect(() => {
    loadTransactions().finally(() => setLoading(false));
  }, [loadTransactions]);

  const bankName = (id) => bankMap[id] ?? id ?? '—';

  const filtered = transactions.filter(t => {
    if (filter === 'all')       return true;
    if (filter === 'credit')    return t.direction === 'credit';
    if (filter === 'debit')     return t.direction === 'debit';
    if (filter === 'pending')   return t.status    === 'pending';
    if (filter === 'failed')    return t.status    === 'failed';
    if (filter === 'interbank') return t.type      === 'interbank_transfer';
    return true;
  });

  const rollbackCount = transactions.filter(isRollbackEligible).length;

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    setRolling(true);
    try {
      await rollbackTransaction(rollbackTarget.id, staffData?.uid ?? 'staff');
      toast.success(`₹${paiseToRupees(rollbackTarget.amount)} refunded to sender.`);
      setRollbackTarget(null);
      await loadTransactions();
    } catch (err) {
      toast.error(err.message ?? 'Rollback failed.');
    } finally {
      setRolling(false);
    }
  };

  const handleRollbackAll = async () => {
    const eligible = transactions.filter(isRollbackEligible);
    if (eligible.length === 0) return;
    setRollingAll(true);
    setRollbackAllProgress({ done: 0, total: eligible.length });
    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < eligible.length; i++) {
      try {
        await rollbackTransaction(eligible[i].id, staffData?.uid ?? 'staff');
        succeeded++;
      } catch {
        failed++;
      }
      setRollbackAllProgress({ done: i + 1, total: eligible.length });
    }
    setRollingAll(false);
    setRollbackAllProgress(null);
    setRollbackAllOpen(false);
    if (succeeded > 0) toast.success(`${succeeded} transfer${succeeded > 1 ? 's' : ''} rolled back.`);
    if (failed > 0)    toast.error(`${failed} rollback${failed > 1 ? 's' : ''} failed.`);
    await loadTransactions();
  };

  if (loading) return <LoadingSpinner message="Loading transactions…" />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5">
            {isCustomer ? 'My Transfers' : 'Transaction History'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {transactions.length} records
            {isStaff && rollbackCount > 0 && (
              <Chip
                label={`${rollbackCount} need attention`}
                size="small"
                color="warning"
                sx={{ ml: 1.5, height: 20, fontSize: 11 }}
              />
            )}
          </Typography>
        </Box>
      </Box>

      {/* Rollback banner — staff only */}
      {isStaff && rollbackCount > 0 && (
        <Alert
          severity="warning"
          icon={<UndoIcon fontSize="small" />}
          action={
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<UndoIcon sx={{ fontSize: 14 }} />}
              onClick={() => setRollbackAllOpen(true)}
              sx={{ fontSize: 11, whiteSpace: 'nowrap' }}
            >
              Rollback All ({rollbackCount})
            </Button>
          }
        >
          <strong>{rollbackCount} interbank transfer{rollbackCount > 1 ? 's are' : ' is'} pending or failed</strong>
          {' '}and may not have reached the recipient.
        </Alert>
      )}

      {/* Filter bar */}
      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_, v) => v && setFilter(v)}
        size="small"
        sx={{ flexWrap: 'wrap' }}
      >
        {FILTERS.map(f => (
          <ToggleButton
            key={f}
            value={f}
            sx={{ textTransform: 'capitalize', px: 2, fontSize: 12 }}
          >
            {f}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Ref ID', 'Type', 'Dir', 'Amount', 'Route', 'Mode', 'Status', 'Date',
                ...(isStaff ? ['Action'] : [])
              ].map(h => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isStaff ? 9 : 8}
                  sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontSize: 13 }}
                >
                  No transactions match this filter.
                </TableCell>
              </TableRow>
            ) : filtered.map(txn => {
              const eligible = isStaff && isRollbackEligible(txn);
              return (
                <TableRow
                  key={txn.id}
                  hover
                  sx={eligible ? { bgcolor: '#FFFBF0', '&:hover': { bgcolor: '#FFF6E0' } } : {}}
                >
                  {/* Ref ID */}
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                      {txn.id.slice(0, 8)}…
                    </Typography>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                      {txn.type === 'intrabank_transfer' ? 'Internal'
                        : txn.type === 'rollback'        ? 'Refund'
                        : txn.type === 'deposit'         ? 'Deposit'
                        : 'Interbank'}
                    </Typography>
                  </TableCell>

                  {/* Direction */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {txn.direction === 'credit'
                        ? <ArrowDownwardIcon sx={{ color: 'success.main', fontSize: 15 }} />
                        : <ArrowUpwardIcon   sx={{ color: 'error.main',   fontSize: 15 }} />}
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{ color: txn.direction === 'credit' ? 'success.main' : 'error.main', textTransform: 'capitalize' }}
                      >
                        {txn.direction}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Amount */}
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ color: txn.direction === 'credit' ? 'success.main' : 'error.main' }}
                    >
                      {txn.direction === 'credit' ? '+' : '−'}{paiseToRupees(txn.amount)}
                    </Typography>
                  </TableCell>

                  {/* Route */}
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace">
                      {bankName(txn.fromBankId)} → {bankName(txn.toBankId)}
                    </Typography>
                  </TableCell>

                  {/* Mode */}
                  <TableCell>
                    <Typography variant="caption">{modeLabel(txn.mode)}</Typography>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusChip status={txn.status} />
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    <Typography variant="caption" noWrap>{formatDate(txn.createdAt)}</Typography>
                  </TableCell>

                  {/* Action — staff only */}
                  {isStaff && (
                    <TableCell>
                      {eligible ? (
                        <Tooltip
                          title={
                            txn.status === 'failed'
                              ? 'Hub write failed — refund sender'
                              : 'Cancel hub transfer and refund sender'
                          }
                          arrow
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<UndoIcon sx={{ fontSize: 14 }} />}
                            onClick={() => setRollbackTarget(txn)}
                            sx={{ fontSize: 11, py: 0.25, px: 1, whiteSpace: 'nowrap' }}
                          >
                            Rollback
                          </Button>
                        </Tooltip>
                      ) : txn.status === 'rolled_back' ? (
                        <Typography variant="caption" color="text.disabled">Refunded</Typography>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Rollback All confirmation dialog */}
      <Dialog
        open={rollbackAllOpen}
        onClose={() => !rollingAll && setRollbackAllOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>
          Rollback All Pending Transfers
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13, mb: 2 }}>
            This will rollback <strong>{rollbackCount} transfer{rollbackCount > 1 ? 's' : ''}</strong> totalling{' '}
            <strong>
              {paiseToRupees(transactions.filter(isRollbackEligible).reduce((s, t) => s + t.amount, 0))}
            </strong>.
            Each sender will receive a full refund.
          </DialogContentText>
          {rollbackAllProgress && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Processing {rollbackAllProgress.done} of {rollbackAllProgress.total}…
              </Typography>
              <Box sx={{
                mt: 0.75, height: 4, borderRadius: 2,
                bgcolor: 'grey.200', overflow: 'hidden',
              }}>
                <Box sx={{
                  height: '100%', borderRadius: 2, bgcolor: 'warning.main',
                  width: `${(rollbackAllProgress.done / rollbackAllProgress.total) * 100}%`,
                  transition: 'width 0.2s',
                }} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setRollbackAllOpen(false)}
            disabled={rollingAll}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={rollingAll ? null : <UndoIcon />}
            onClick={handleRollbackAll}
            disabled={rollingAll}
          >
            {rollingAll ? `Processing…` : `Rollback All (${rollbackCount})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Single rollback confirmation dialog */}
      <Dialog
        open={!!rollbackTarget}
        onClose={() => !rolling && setRollbackTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>
          Confirm Rollback
        </DialogTitle>
        <DialogContent>
          {rollbackTarget && (
            <>
              <DialogContentText sx={{ fontSize: 13, mb: 2 }}>
                This will cancel the transfer and refund{' '}
                <strong>{paiseToRupees(rollbackTarget.amount)}</strong> to the sender's account.
              </DialogContentText>

              {/* Summary box */}
              <Box sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                fontSize: 13,
              }}>
                {[
                  ['Transaction ID', rollbackTarget.id],
                  ['Amount',         paiseToRupees(rollbackTarget.amount)],
                  ['Route',          `${bankName(rollbackTarget.fromBankId)} → ${bankName(rollbackTarget.toBankId)}`],
                  ['Current status', rollbackTarget.status],
                  ['Date',           formatDate(rollbackTarget.createdAt)],
                ].map(([label, value], i, arr) => (
                  <Box
                    key={label}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      px: 2, py: 1,
                      bgcolor: i % 2 === 0 ? 'grey.50' : 'background.paper',
                      borderBottom: i < arr.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography
                      variant="caption"
                      fontWeight={500}
                      fontFamily={label === 'Transaction ID' ? 'monospace' : 'inherit'}
                      sx={{ textTransform: 'capitalize', maxWidth: 200, textAlign: 'right', wordBreak: 'break-all' }}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {rollbackTarget.status === 'pending' && (
                <Alert severity="warning" sx={{ mt: 2, fontSize: 12 }}>
                  The hub transfer will be cancelled before the refund is processed.
                  If the receiving bank has already credited the recipient, contact them to reverse it manually.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setRollbackTarget(null)}
            disabled={rolling}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={rolling ? null : <UndoIcon />}
            onClick={handleRollback}
            disabled={rolling}
          >
            {rolling ? 'Processing…' : 'Confirm Rollback'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
