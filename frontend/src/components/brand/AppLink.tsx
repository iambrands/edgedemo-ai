import { Link, type LinkProps } from 'react-router-dom';
import { appUrl } from '../../utils/appUrl';

type AppLinkProps = Omit<LinkProps, 'to'> & { to: string };

/** Link to app routes — uses app.firmum.ai when rendered on the marketing site */
export function AppLink({ to, ...props }: AppLinkProps) {
  const href = appUrl(to);
  if (href.startsWith('http')) {
    return <a href={href} {...props} />;
  }
  return <Link to={href} {...props} />;
}
