import React, { ReactNode } from 'react';

// Type definitions for props
export interface ButtonPropsType {
  children?: ReactNode;
  color?: string;
  size?: string;
  fill?: string;
  loading?: boolean;
  block?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export interface BadgePropsType {
  children?: ReactNode;
  color?: string;
  content?: ReactNode;
  dot?: boolean;
  className?: string;
}

export interface AvatarPropsType {
  children?: ReactNode;
  src?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export interface ListPropsType {
  children?: ReactNode;
}

export interface ListItemPropsType {
  children?: ReactNode;
  prefix?: ReactNode;
  description?: ReactNode;
  onClick?: () => void;
}

export interface PullToRefreshPropsType {
  children?: ReactNode;
  onRefresh?: () => Promise<void>;
}

export interface LoadingPropsType {
  show?: boolean;
}

export interface ErrorBlockPropsType {
  status?: string;
  title?: string;
  description?: string;
}

export interface TagPropsType {
  children?: ReactNode;
  color?: string;
}

export interface TabsPropsType {
  children?: ReactNode;
  activeKey?: string;
  onChange?: (key: string) => void;
}

export interface TabPropsType {
  children?: ReactNode;
  title?: string;
  key?: string;
}

// Placeholder Button component
export const Button: React.FC<ButtonPropsType> = ({
  children,
  color,
  size,
  fill,
  loading,
  block,
  onClick,
  style,
}) => {
  const baseClasses = 'px-4 py-2 rounded border transition-colors';
  const colorClasses = color === 'primary' ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' : 
                       'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300';
  const sizeClasses = size === 'large' ? 'px-6 py-3 text-lg' :
                      size === 'small' ? 'px-2 py-1 text-sm' :
                      size === 'mini' ? 'px-2 py-1 text-xs' : '';
  const fillClasses = fill === 'none' ? 'bg-transparent border-none text-blue-500 hover:bg-blue-50' : '';
  const blockClass = block ? 'w-full' : '';
  
  return (
    <button
      className={`${baseClasses} ${colorClasses} ${sizeClasses} ${fillClasses} ${blockClass} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={loading ? undefined : onClick}
      style={style}
      disabled={loading}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

// Placeholder Badge component
export const Badge: React.FC<BadgePropsType> = ({
  children,
  color,
  content,
  dot,
  className,
}) => {
  if (dot) {
    return (
      <div className={`relative ${className || ''}`}>
        {children}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
      </div>
    );
  }
  
  if (content) {
    return (
      <div className={`relative ${className || ''}`}>
        {children}
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
          {content}
        </span>
      </div>
    );
  }
  
  const colorClasses = color === 'success' ? 'bg-green-500' :
                       color === 'danger' ? 'bg-red-500' : 'bg-gray-500';
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs text-white ${colorClasses}`}>
      {content || children}
    </span>
  );
};

// Placeholder Avatar component
export const Avatar: React.FC<AvatarPropsType> = ({
  children,
  src,
  size = 40,
  className,
  style,
}) => {
  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    ...style,
  };
  
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={className}
        style={baseStyle}
      />
    );
  }
  
  return (
    <div className={className} style={baseStyle}>
      {children}
    </div>
  );
};

// Placeholder List component
const ListComponent: React.FC<ListPropsType> = ({ children }) => {
  return <div className="bg-white">{children}</div>;
};

const ListItem: React.FC<ListItemPropsType> = ({ children, prefix, description, onClick }) => {
  return (
    <div 
      className="flex items-center p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
      onClick={onClick}
    >
      {prefix && <div className="mr-3">{prefix}</div>}
      <div className="flex-1">
        <div>{children}</div>
        {description && <div className="text-sm text-gray-500 mt-1">{description}</div>}
      </div>
    </div>
  );
};

export const List = Object.assign(ListComponent, {
  Item: ListItem
});

// Placeholder PullToRefresh component
export const PullToRefresh: React.FC<PullToRefreshPropsType> = ({
  children,
  onRefresh,
}) => {
  return <div>{children}</div>;
};

// Placeholder Loading component
export const Loading: React.FC<LoadingPropsType> = ({ show = true }) => {
  if (!show) return null;
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
};

// Placeholder ErrorBlock component
export const ErrorBlock: React.FC<ErrorBlockPropsType> = ({
  status,
  title,
  description,
}) => {
  return (
    <div className="text-center p-8">
      <div className="text-6xl mb-4">⚠️</div>
      <div className="text-lg font-medium mb-2">{title}</div>
      <div className="text-gray-500">{description}</div>
    </div>
  );
};

// Placeholder Tag component
export const Tag: React.FC<TagPropsType> = ({ children, color }) => {
  const colorClasses = color === 'success' ? 'bg-green-100 text-green-800' :
                       color === 'default' ? 'bg-gray-100 text-gray-800' :
                       'bg-blue-100 text-blue-800';
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${colorClasses}`}>
      {children}
    </span>
  );
};

// Placeholder Tabs component
const TabsComponent: React.FC<TabsPropsType> = ({ children, activeKey, onChange }) => {
  return (
    <div>
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              const isActive = child.props.key === activeKey;
              return (
                <button
                  key={child.props.key}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => onChange?.(child.props.key)}
                >
                  {child.props.title}
                </button>
              );
            }
            return null;
          })}
        </div>
      </div>
      <div className="pt-4">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.props.key === activeKey) {
            return child.props.children;
          }
          return null;
        })}
      </div>
    </div>
  );
};

const TabComponent: React.FC<TabPropsType> = ({ children }) => {
  return <div>{children}</div>;
};

export const Tabs = Object.assign(TabsComponent, {
  Tab: TabComponent
});

// Icon placeholders
export const BellOutline = ({ className }: { className?: string }) => (
  <span className={className}>🔔</span>
);

export const CheckCircleOutline = ({ color, style }: { color?: string; style?: React.CSSProperties }) => (
  <span style={{ color, ...style }}>✅</span>
);

export const QuestionCircleOutline = ({ color, style }: { color?: string; style?: React.CSSProperties }) => (
  <span style={{ color, ...style }}>❓</span>
);

export const CloseCircleOutline = ({ color, style }: { color?: string; style?: React.CSSProperties }) => (
  <span style={{ color, ...style }}>❌</span>
);

export const ClockCircleOutline = ({ color, style }: { color?: string; style?: React.CSSProperties }) => (
  <span style={{ color, ...style }}>🕐</span>
);

// Space component
export const Space: React.FC<{ children: ReactNode; size?: string; align?: string }> = ({ 
  children, 
  size = 'small',
  align = 'start'
}) => {
  const gapClass = size === 'large' ? 'gap-4' : 'gap-2';
  const alignClass = `items-${align}`;
  
  return (
    <div className={`flex ${alignClass} ${gapClass}`}>
      {children}
    </div>
  );
};