import React, { createContext, useContext, useState } from 'react';

interface CreateModalContextType {
  isOpen: boolean; // backward compatibility for create modal
  isCreateOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  editRequestId: number | string | null;
  openEditModal: (id: number | string) => void;
  closeEditModal: () => void;
}

const CreateModalContext = createContext<CreateModalContextType | undefined>(undefined);

export const CreateModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRequestId, setEditRequestId] = useState<number | string | null>(null);

  const openCreateModal = () => setIsCreateOpen(true);
  const closeCreateModal = () => setIsCreateOpen(false);

  const openEditModal = (id: number | string) => setEditRequestId(id);
  const closeEditModal = () => setEditRequestId(null);

  return (
    <CreateModalContext.Provider
      value={{
        isOpen: isCreateOpen,
        isCreateOpen,
        openCreateModal,
        closeCreateModal,
        editRequestId,
        openEditModal,
        closeEditModal,
      }}
    >
      {children}
    </CreateModalContext.Provider>
  );
};

export const useCreateModal = (): CreateModalContextType => {
  const context = useContext(CreateModalContext);
  if (!context) {
    throw new Error('useCreateModal must be used within a CreateModalProvider');
  }
  return context;
};
