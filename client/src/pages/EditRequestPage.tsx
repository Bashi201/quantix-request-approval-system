import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCreateModal } from '@/context/CreateModalContext';
import { LoadingState } from '@/components/common/LoadingState';

export const EditRequestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openEditModal } = useCreateModal();

  useEffect(() => {
    if (id) {
      openEditModal(id);
      navigate(`/requests/${id}`, { replace: true });
    } else {
      navigate('/requests', { replace: true });
    }
  }, [id, openEditModal, navigate]);

  return (
    <div className="py-12 flex justify-center">
      <LoadingState message="Opening edit window..." />
    </div>
  );
};
