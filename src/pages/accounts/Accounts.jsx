// src/pages/accounts/Accounts.jsx — MUI

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AddIcon        from '@mui/icons-material/Add';
import { getAllAccounts } from '../../services/accountService';
import { paiseToRupees, formatDate } from '../../utils/formatters';
import { LoadingSpinner, StatusChip } from '../../components/ui';

export const Accounts = () => {
  const navigate   = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { getAllAccounts().then(setAccounts).finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingSpinner message="Loading accounts…" />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCardIcon /> Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{accounts.length} accounts</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/accounts/new')}>
          New account
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              {['Account no.','Customer','Type','Balance','IFSC','Status','Created',''].map(h => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow><TableCell colSpan={8} sx={{ textAlign:'center', py:4, color:'text.secondary' }}>No accounts yet.</TableCell></TableRow>
            ) : accounts.map(acc => (
              <TableRow key={acc.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/accounts/${acc.id}`)}>
                <TableCell><Typography variant="caption" fontFamily="monospace">••••{acc.accountNumber?.slice(-4)}</Typography></TableCell>
                <TableCell><Typography variant="body2">{acc.customerName}</Typography></TableCell>
                <TableCell><Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{acc.accountType}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontWeight={600}>{paiseToRupees(acc.balance)}</Typography></TableCell>
                <TableCell><Typography variant="caption" fontFamily="monospace">{acc.ifscCode}</Typography></TableCell>
                <TableCell><StatusChip status={acc.status} /></TableCell>
                <TableCell><Typography variant="caption">{formatDate(acc.createdAt)}</Typography></TableCell>
                <TableCell><Button size="small" onClick={e => { e.stopPropagation(); navigate(`/accounts/${acc.id}`); }}>View</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
