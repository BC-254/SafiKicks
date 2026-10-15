import { useState, useEffect } from 'react';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import {
  Button,
  Card,
  CardHeader,
  Table,
  RoleBadge,
  ActiveBadge,
  Modal,
  Input,
  Select,
  useToast,
  ConfirmModal,
} from '../../design-system';
import { formatDate } from '../../utils/formatters';
import { UserPlus, UserCheck, UserX, Shield } from 'lucide-react';

export function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    role: 'counter_staff',
    email: '',
    phone: '',
    password: '',
  });

  // Toggle status confirmation
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const { user: currentUser } = useAuthStore();
  const toast = useToast();

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await authApi.getStaff();
      setStaffList(data.staff || []);
    } catch (err) {
      toast.error('Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Name, email, and password are required.');
      return;
    }

    try {
      setSubmitting(true);
      await authApi.createStaff(formData);
      toast.success(`Staff account created for ${formData.name}.`);
      setIsModalOpen(false);
      setFormData({
        name: '',
        role: 'counter_staff',
        email: '',
        phone: '',
        password: '',
      });
      loadStaff();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;

    if (toggleTarget.id === currentUser?.id) {
      toast.error('You cannot deactivate your own account.');
      setToggleTarget(null);
      return;
    }

    try {
      setToggleLoading(true);
      const newActive = !toggleTarget.active;
      await authApi.updateStaff(toggleTarget.id, { active: newActive });
      toast.success(`${toggleTarget.name} is now ${newActive ? 'Active' : 'Deactivated'}.`);
      setToggleTarget(null);
      loadStaff();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update account.');
    } finally {
      setToggleLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Staff Member',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{row.name}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Joined {formatDate(row.created_at)}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (role) => <RoleBadge role={role} />,
    },
    {
      key: 'email',
      label: 'Email & Phone',
      render: (_, row) => (
        <div>
          <div>{row.email}</div>
          {row.phone && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {row.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      render: (active) => <ActiveBadge active={active} />,
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (_, row) => {
        const isSelf = row.id === currentUser?.id;
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={isSelf}
            onClick={(e) => {
              e.stopPropagation();
              setToggleTarget(row);
            }}
          >
            {row.active ? (
              <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <UserX size={14} /> Deactivate
              </span>
            ) : (
              <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <UserCheck size={14} /> Reactivate
              </span>
            )}
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
            Staff Accounts
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Manage counter staff and shoe repairer access permissions.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={16} /> Add Staff Member
        </Button>
      </div>

      <Card flat style={{ padding: 0, overflow: 'hidden' }}>
        <Table
          columns={columns}
          rows={staffList}
          loading={loading}
          emptyMessage="No staff accounts registered yet."
        />
      </Card>

      {/* Add Staff Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Staff Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateStaff} loading={submitting}>
              Create Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            autoFocus
          />

          <Select
            label="Role & Permissions"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            required
          >
            <option value="counter_staff">Counter Staff (Intake, Tagging & Release)</option>
            <option value="repairer">Repairer (Queue, Claims & Status)</option>
            <option value="owner">Shop Owner / Administrator</option>
          </Select>

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />

          <Input
            label="Phone Number (optional)"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+254700000000"
          />

          <Input
            label="Temporary Password (min. 8 characters)"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            hint="The staff member will use this to sign in."
          />
        </form>
      </Modal>

      {/* Toggle Active Confirmation Modal */}
      <ConfirmModal
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleActive}
        title={toggleTarget?.active ? 'Deactivate Account' : 'Reactivate Account'}
        message={
          toggleTarget?.active
            ? `Are you sure you want to deactivate ${toggleTarget?.name}? They will immediately be logged out and cannot sign in until reactivated.`
            : `Are you sure you want to reactivate access for ${toggleTarget?.name}?`
        }
        confirmLabel={toggleTarget?.active ? 'Deactivate' : 'Reactivate'}
        danger={toggleTarget?.active}
        loading={toggleLoading}
      />
    </div>
  );
}
