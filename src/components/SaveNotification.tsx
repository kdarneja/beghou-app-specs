import { Notification, NotificationGroup } from '@progress/kendo-react-notification';

// Shared success notification for Save/Submit across the IC module and admin.
// Kendo semantic "success" (green) Notification, anchored just below the AppBar,
// top-centre. Render with a null/string `text`; auto-dismiss is handled by the
// caller (it clears `text` on a timer) and it's also manually closable.
export function SaveNotification({ text, onClose }: { text: string | null; onClose: () => void }) {
  return (
    <NotificationGroup
      className="bh-notify-group"
      style={{ top: 64, left: '50%', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)', alignItems: 'center' }}
    >
      {text && (
        <Notification type={{ style: 'success', icon: true }} closable onClose={onClose}>
          <span>{text}</span>
        </Notification>
      )}
    </NotificationGroup>
  );
}
