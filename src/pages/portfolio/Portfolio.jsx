// src/pages/portfolio/Portfolio.jsx — MUI, no lucide/tailwind

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, List, ListItem, ListItemText, Divider, Button } from '@mui/material';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CreditCardIcon   from '@mui/icons-material/CreditCard';
import PieChartIcon     from '@mui/icons-material/PieChart';
import { useAuth }      from '../../context/AuthContext';
import { getMyAccounts } from '../../services/accountService';
import { getTransactionsByAccount } from '../../services/transactionService';
import { getMyLoans } from '../../services/loanService';
import { paiseToRupees, formatDate } from '../../utils/formatters';
import { StatCard, LoadingSpinner, StatusChip } from '../../components/ui';

export const Portfolio = () => {
  const { isCustomer, customerData } = useAuth();
  const navigate = useNavigate();
  const [accounts,     setAccounts]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loans,        setLoans]        = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const accs = isCustomer ? await getMyAccounts(customerData.uid) : [];
        setAccounts(accs);
        if (accs.length > 0) {
          const map = new Map();
          (await Promise.all(accs.map(a => getTransactionsByAccount(a.id)))).flat().forEach(t => map.set(t.id, t));
          setTransactions([...map.values()].sort((a,b)=>(b.createdAt?.toMillis?.()??0)-(a.createdAt?.toMillis?.()??0)));
        }
        if (isCustomer) setLoans(await getMyLoans(customerData.uid));
      } finally { setLoading(false); }
    })();
  }, [isCustomer, customerData]);

  if (loading) return <LoadingSpinner message="Loading portfolio…" />;

  const totalBalance = accounts.reduce((s,a)=>s+(a.balance??0),0);
  const totalCredit  = transactions.filter(t=>t.direction==='credit').reduce((s,t)=>s+t.amount,0);
  const totalDebit   = transactions.filter(t=>t.direction==='debit').reduce((s,t)=>s+t.amount,0);
  const activeLoans  = loans.filter(l=>l.status==='approved');
  const totalDebt    = activeLoans.reduce((s,l)=>s+l.amountPaise,0);
  const monthlyEMI   = activeLoans.reduce((s,l)=>s+l.emiPaise,0);

  return (
    <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>
      <Box>
        <Typography variant="h5" sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <PieChartIcon /> My Portfolio
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Complete overview of your accounts, transfers and loans</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={6} md={3}><StatCard label="Total balance"  value={paiseToRupees(totalBalance)} icon={TrendingUpIcon}/></Grid>
        <Grid item xs={6} md={3}><StatCard label="Total received" value={paiseToRupees(totalCredit)}  icon={TrendingUpIcon}/></Grid>
        <Grid item xs={6} md={3}><StatCard label="Total sent"     value={paiseToRupees(totalDebit)}   icon={TrendingDownIcon}/></Grid>
        <Grid item xs={6} md={3}><StatCard label="Active loans"   value={activeLoans.length}          icon={CreditCardIcon}/></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>My accounts</Typography>
              {accounts.length===0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>No accounts yet.</Typography>
              ) : accounts.map((acc,i)=>{
                const cr=transactions.filter(t=>t.toAccountId===acc.id&&t.direction==='credit').reduce((s,t)=>s+t.amount,0);
                const dr=transactions.filter(t=>t.fromAccountId===acc.id&&t.direction==='debit').reduce((s,t)=>s+t.amount,0);
                return (
                  <Box key={acc.id}>
                    <Box sx={{ py:1.5 }}>
                      <Box sx={{ display:'flex', justifyContent:'space-between', mb:1 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600} fontFamily="monospace">{acc.accountNumber}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform:'capitalize' }}>{acc.accountType} · {acc.ifscCode}</Typography>
                        </Box>
                        <Box sx={{ textAlign:'right' }}>
                          <Typography variant="h6" fontWeight={700}>{paiseToRupees(acc.balance)}</Typography>
                          <StatusChip status={acc.status}/>
                        </Box>
                      </Box>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Box sx={{ bgcolor:'success.light', borderRadius:1, p:1, textAlign:'center' }}>
                            <Typography variant="caption" color="text.secondary">Received</Typography>
                            <Typography variant="body2" fontWeight={600} color="success.dark">{paiseToRupees(cr)}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ bgcolor:'error.light', borderRadius:1, p:1, textAlign:'center' }}>
                            <Typography variant="caption" color="text.secondary">Sent</Typography>
                            <Typography variant="body2" fontWeight={600} color="error.dark">{paiseToRupees(dr)}</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                    {i<accounts.length-1&&<Divider/>}
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Transfer summary</Typography>
              <List dense disablePadding>
                {[
                  {label:'Total transactions',  value:transactions.length,                                              color:'text.primary'},
                  {label:'Internal transfers',   value:transactions.filter(t=>t.type==='intrabank_transfer').length,    color:'primary.main'},
                  {label:'Interbank transfers',  value:transactions.filter(t=>t.type==='interbank_transfer').length,    color:'secondary.main'},
                  {label:'Pending transfers',    value:transactions.filter(t=>t.status==='pending').length,             color:'warning.main'},
                  {label:'Failed transfers',     value:transactions.filter(t=>t.status==='failed').length,              color:'error.main'},
                ].map(({label,value,color},i,arr)=>(
                  <Box key={label}>
                    <ListItem disablePadding sx={{ py:1 }}>
                      <ListItemText primary={label} primaryTypographyProps={{variant:'body2',color:'text.secondary'}}/>
                      <Typography variant="h6" fontWeight={700} color={color}>{value}</Typography>
                    </ListItem>
                    {i<arr.length-1&&<Divider/>}
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Loan portfolio</Typography>
              {loans.length===0 ? (
                <Box sx={{ textAlign:'center', py:3 }}>
                  <Typography variant="body2" color="text.secondary" mb={1}>No loans yet.</Typography>
                  <Button variant="text" onClick={()=>navigate('/loans')}>Apply for a loan →</Button>
                </Box>
              ) : (
                <>
                  {activeLoans.length>0&&(
                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={6}>
                        <Box sx={{ bgcolor:'warning.light', borderRadius:2, p:2, textAlign:'center' }}>
                          <Typography variant="caption" color="text.secondary">Total outstanding</Typography>
                          <Typography variant="h6" fontWeight={700} color="warning.dark">{paiseToRupees(totalDebt)}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ bgcolor:'primary.light', borderRadius:2, p:2, textAlign:'center' }}>
                          <Typography variant="caption" color="text.secondary">Monthly EMI</Typography>
                          <Typography variant="h6" fontWeight={700} color="primary.dark">{paiseToRupees(monthlyEMI)}</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  )}
                  <List dense disablePadding>
                    {loans.map((loan,i)=>(
                      <Box key={loan.id}>
                        <ListItem disablePadding sx={{ py:1 }}>
                          <ListItemText
                            primary={`${loan.loanType?.replace('_',' ')} loan`}
                            secondary={`${loan.durationMonths} months · ${loan.interestRate}% p.a. · EMI ${paiseToRupees(loan.emiPaise)}`}
                            primaryTypographyProps={{fontWeight:600,textTransform:'capitalize'}}
                          />
                          <Box sx={{ textAlign:'right' }}>
                            <Typography variant="body2" fontWeight={600}>{paiseToRupees(loan.amountPaise)}</Typography>
                            <StatusChip status={loan.status}/>
                          </Box>
                        </ListItem>
                        {i<loans.length-1&&<Divider/>}
                      </Box>
                    ))}
                  </List>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
