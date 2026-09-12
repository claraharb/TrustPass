import { Link } from 'react-router-dom';

interface ClientBreadcrumbProps {
    current: string;
}

export function ClientBreadcrumb({ current }: ClientBreadcrumbProps) {
    return (
        <div className="client-breadcrumb">
            <Link to="/client">Client workspace</Link>
            <span aria-hidden="true">/</span>
            <strong>{current}</strong>
        </div>
    );
}