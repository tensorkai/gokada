import Link from 'next/link';
export default function NotFound() {
  return <div className="content-page empty-state"><span className="demo-tag">404</span><h1>A little off route.</h1><p>That page doesn’t exist. Let’s get you back to your next trip.</p><Link className="primary-button" href="/">Back to booking</Link></div>;
}
