import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const RouteTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [displayed, setDisplayed] = useState(children);
  const [stage, setStage] = useState<"in" | "out">("in");

  useEffect(() => {
    setStage("out");
    const t = setTimeout(() => {
      setDisplayed(children);
      setStage("in");
    }, 140);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    setDisplayed(children);
  }, [children]);

  return (
    <div
      key={location.pathname}
      className={stage === "in" ? "route-fade-in" : "route-fade-out"}
    >
      {displayed}
    </div>
  );
};

export default RouteTransition;
