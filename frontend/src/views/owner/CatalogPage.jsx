import { useState, useEffect } from 'react';
import { catalogApi } from '../../api/catalog.api';
import {
  Button,
  Card,
  Table,
  Badge,
  ActiveBadge,
  Modal,
  Input,
  useToast,
  ConfirmModal,
} from '../../design-system';
import { formatKES, formatPriceRange } from '../../utils/formatters';
import { Plus, Edit2, Power, Clock, Tag } from 'lucide-react';

export function CatalogPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formMinPrice, setFormMinPrice] = useState('');
  const [formMaxPrice, setFormMaxPrice] = useState('');
  const [formIsFixed, setFormIsFixed] = useState(false);
  const [formHours, setFormHours] = useState('');

  // Status toggle confirmation
  const [toggleItem, setToggleItem] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const toast = useToast();

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await catalogApi.getAllServices();
      setServices(data.services || []);
    } catch (err) {
      toast.error('Failed to load service catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormMinPrice('');
    setFormMaxPrice('');
    setFormIsFixed(false);
    setFormHours('24');
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormMinPrice(String(item.min_price));
    setFormMaxPrice(item.max_price != null ? String(item.max_price) : '');
    setFormIsFixed(item.max_price != null && Number(item.min_price) === Number(item.max_price));
    setFormHours(item.standard_turnaround_hours ? String(item.standard_turnaround_hours) : '');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName || formMinPrice === '') {
      toast.error('Service name and minimum price are required.');
      return;
    }

    const min = Number(formMinPrice);
    if (isNaN(min) || min < 0) {
      toast.error('Minimum price must be a valid non-negative number.');
      return;
    }

    let max = null;
    if (formIsFixed) {
      max = min;
    } else if (formMaxPrice !== '') {
      max = Number(formMaxPrice);
      if (isNaN(max) || max < min) {
        toast.error('Maximum price must be greater than or equal to minimum price.');
        return;
      }
    }

    const payload = {
      name: formName,
      min_price: min,
      max_price: max,
      standard_turnaround_hours: formHours ? parseInt(formHours, 10) : null,
    };

    try {
      setSubmitting(true);
      if (editingItem) {
        await catalogApi.updateService(editingItem.id, payload);
        toast.success(`Service "${formName}" updated.`);
      } else {
        await catalogApi.createService(payload);
        toast.success(`Service "${formName}" added to catalog.`);
      }
      setModalOpen(false);
      loadServices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleItem) return;
    try {
      setToggleLoading(true);
      const newActive = !toggleItem.active;
      await catalogApi.updateService(toggleItem.id, { active: newActive });
      toast.success(`Service "${toggleItem.name}" is now ${newActive ? 'Active' : 'Deactivated'}.`);
      setToggleItem(null);
      loadServices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update service.');
    } finally {
      setToggleLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Service Name',
      render: (name, row) => (
        <div>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)' }}>
            {name}
          </div>
          {row.standard_turnaround_hours && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: 2,
            }}>
              <Clock size={12} /> Standard: {row.standard_turnaround_hours} hours ({Math.round(row.standard_turnaround_hours / 24)} days)
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'price_band',
      label: 'Approved Price Band',
      render: (_, row) => {
        const isFixed = row.max_price != null && Number(row.min_price) === Number(row.max_price);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
              {formatPriceRange(row.min_price, row.max_price)}
            </span>
            {isFixed && <Badge variant="blue">Fixed Price</Badge>}
            {row.name === 'Other' && <Badge variant="amber">Custom Quote</Badge>}
          </div>
        );
      },
    },
    {
      key: 'active',
      label: 'Catalog Status',
      render: (active) => <ActiveBadge active={active} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
          >
            <Edit2 size={13} /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setToggleItem(row);
            }}
          >
            <Power size={13} style={{ color: row.active ? 'var(--color-danger)' : 'var(--color-success)' }} />
            {row.active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
            Service Catalog & Pricing Controls
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Maintain approved price bands. Prices outside these limits require owner approval before quoting customers.
          </p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <Plus size={16} /> Add Service
        </Button>
      </div>

      <Card flat style={{ padding: 0, overflow: 'hidden' }}>
        <Table
          columns={columns}
          rows={services}
          loading={loading}
          emptyMessage="No services found in catalog."
        />
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Service' : 'Add New Service'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={submitting}>
              {editingItem ? 'Save Changes' : 'Create Service'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Service Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: -4 }}>
            <input
              type="checkbox"
              id="isFixedPrice"
              checked={formIsFixed}
              onChange={(e) => {
                setFormIsFixed(e.target.checked);
                if (e.target.checked) setFormMaxPrice(formMinPrice);
              }}
              style={{ cursor: 'pointer', accentColor: 'var(--color-accent)' }}
            />
            <label htmlFor="isFixedPrice" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
              Fixed price (standard non-variable fee)
            </label>
          </div>

          <div className="form-grid">
            <Input
              label={formIsFixed ? "Price (KES)" : "Minimum Price (KES)"}
              type="number"
              min="0"
              value={formMinPrice}
              onChange={(e) => {
                setFormMinPrice(e.target.value);
                if (formIsFixed) setFormMaxPrice(e.target.value);
              }}
              required
            />

            {!formIsFixed && (
              <Input
                label="Maximum Price (KES, optional)"
                type="number"
                min={formMinPrice || "0"}
                value={formMaxPrice}
                onChange={(e) => setFormMaxPrice(e.target.value)}
                hint="Leave blank if no upper cap (e.g. Other)"
              />
            )}
          </div>

          <Input
            label="Standard Turnaround Time (Hours, optional)"
            type="number"
            min="1"
            value={formHours}
            onChange={(e) => setFormHours(e.target.value)}
            hint="e.g. 24 for 1 day, 48 for 2 days"
          />
        </form>
      </Modal>

      {/* Confirm Deactivate / Reactivate Modal */}
      <ConfirmModal
        open={Boolean(toggleItem)}
        onClose={() => setToggleItem(null)}
        onConfirm={handleToggleActive}
        title={toggleItem?.active ? 'Deactivate Service' : 'Reactivate Service'}
        message={
          toggleItem?.active
            ? `Deactivating "${toggleItem?.name}" will hide it from the customer registration portal dropdown. Existing jobs using this service will not be affected.`
            : `Reactivate "${toggleItem?.name}" so customers and counter staff can select it again?`
        }
        confirmLabel={toggleItem?.active ? 'Deactivate' : 'Reactivate'}
        danger={toggleItem?.active}
        loading={toggleLoading}
      />
    </div>
  );
}
