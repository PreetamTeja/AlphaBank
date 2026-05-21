import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import {
  Box, Typography, Button, Divider, Paper,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon           from '@mui/icons-material/DoneAll';
import { privateDb } from '../../config/firebasePrivate';
import { timeAgo }   from '../../utils/formatters';
import { LoadingSpinner } from '../../components/ui';

const DOT_COLOR = {
  incoming_transfer:  '#1B7E47',
  transfer_completed: '#003E8A',
  transfer_failed:    '#C62828',
  default:            '#8895A2',
};

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(privateDb, 'notifications')), snap => {
      setNotifications(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const unread     = notifications.filter(n => !n.isRead);
  const markAllRead = () => Promise.all(unread.map(n => updateDoc(doc(privateDb, 'notifications', n.id), { isRead: true })));
  const markOne     = (id) => updateDoc(doc(privateDb, 'notifications', id), { isRead: true });

  if (loading) return <LoadingSpinner message="Loading notifications…" />;

  return (
    <Box sx={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5">Notifications</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            {unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
          </Typography>
        </Box>
        {unread.length > 0 && (
          <Button
            size="small"
            startIcon={<DoneAllIcon sx={{ fontSize: 15 }} />}
            onClick={markAllRead}
            sx={{ color: 'text.secondary', fontSize: 12 }}
          >
            Mark all read
          </Button>
        )}
      </Box>

      {/* List */}
      <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
        {notifications.length === 0 ? (
          <Box sx={{ py: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <NotificationsNoneIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
          </Box>
        ) : notifications.map((n, i) => {
          const dotColor = DOT_COLOR[n.type] ?? DOT_COLOR.default;
          return (
            <Box key={n.id}>
              <Box
                onClick={() => !n.isRead && markOne(n.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  px: 2.5,
                  py: 1.75,
                  bgcolor: !n.isRead ? 'grey.50' : 'transparent',
                  cursor: !n.isRead ? 'pointer' : 'default',
                  '&:hover': !n.isRead ? { bgcolor: 'grey.100' } : {},
                  transition: 'background 0.15s',
                }}
              >
                {/* Unread dot */}
                <Box sx={{ pt: '5px', flexShrink: 0, width: 8 }}>
                  {!n.isRead && (
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dotColor }} />
                  )}
                </Box>

                {/* Message */}
                <Typography
                  variant="body2"
                  color={!n.isRead ? 'text.primary' : 'text.secondary'}
                  fontWeight={!n.isRead ? 500 : 400}
                  sx={{ flex: 1, lineHeight: 1.55 }}
                >
                  {n.message}
                </Typography>

                {/* Timestamp */}
                <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, pt: '2px' }}>
                  {timeAgo(n.createdAt)}
                </Typography>
              </Box>
              {i < notifications.length - 1 && <Divider />}
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
};
