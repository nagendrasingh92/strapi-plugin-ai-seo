import { useEffect, useRef } from 'react';

type InitializerProps = {
  setPlugin: (id: string) => void;
};

const Initializer = ({ setPlugin }: InitializerProps) => {
  const ref = useRef(setPlugin);

  useEffect(() => {
    ref.current('ai-seo');
  }, []);

  return null;
};

export { Initializer };
