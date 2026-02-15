import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { dbQuery } from '../lib/db';

interface Item {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const results = await dbQuery('SELECT * FROM items ORDER BY created_at DESC');
      setItems(results);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;

    try {
      await dbQuery(
        'INSERT INTO items (name, description) VALUES (?, ?)',
        [newItemName, newItemDesc]
      );
      setNewItemName('');
      setNewItemDesc('');
      setIsModalOpen(false);
      loadItems();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleDeleteItem = async (id: number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete === null) return;

    try {
      await dbQuery('DELETE FROM items WHERE id = ?', [itemToDelete]);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      loadItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Example Items</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={20} className="mr-2" />
          Add Item
        </Button>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start justify-between"
          >
            <div>
              <h3 className="text-lg font-semibold text-white">{item.name}</h3>
              {item.description && (
                <p className="text-slate-400 mt-1">{item.description}</p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Created: {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteItem(item.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No items yet. Click "Add Item" to get started.
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Item"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>
              Add Item
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter item name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter item description"
              rows={3}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        title="Confirm Delete"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setIsDeleteModalOpen(false);
              setItemToDelete(null);
            }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-slate-300">
          Are you sure you want to delete this item? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
