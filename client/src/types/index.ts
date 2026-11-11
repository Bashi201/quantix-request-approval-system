export type UserRole = 'employee' | 'manager' | 'operations';

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'returned'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface User extends UserSummary {
  manager_id: number | null;
  manager?: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at: string;
}

export interface RequestComment {
  id: number;
  comment: string;
  is_internal: boolean;
  user: {
    id: number;
    name: string;
    role: string;
  };
  created_at: string;
  updated_at?: string;
}

export interface RequestActivity {
  id: number;
  action: string;
  from_status: string | null;
  to_status: string | null;
  comment: string | null;
  metadata?: Record<string, any> | null;
  user: {
    id: number;
    name: string;
    role: string;
  };
  created_at: string;
}

export interface ServiceRequestSummary {
  id: number;
  request_number: string;
  title: string;
  category: string;
  priority: RequestPriority;
  status: RequestStatus;
  status_label: string;
  sla_due_at: string | null;
  target_sla_date?: string | null;
  is_overdue: boolean;
  comments_count: number;
  requester: UserSummary | null;
  assigned_to: UserSummary | null;
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestDetail extends ServiceRequestSummary {
  description: string;
  comments: RequestComment[];
  activities: RequestActivity[];
}

export type ServiceRequest = ServiceRequestDetail;

export interface InAppNotification {
  id: string;
  type: string;
  data: {
    request_id?: number;
    request_number?: string;
    title?: string;
    status?: string;
    action?: string;
    message?: string;
    comment?: string;
    actor_name?: string;
    [key: string]: any;
  };
  read_at: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  unread_count?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}
