import "../../styles/Common.css";

export default function ProgressBar({
  currentStep,
  totalSteps,
  label,
}) {
  return (
    <div className="cm-progress">
      <div className="cm-progress-bar">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          let cls = "cm-progress-step";
          if (stepNum < currentStep) cls += " cm-progress-step--completed";
          else if (stepNum === currentStep) cls += " cm-progress-step--active";
          return <div key={stepNum} className={cls} />;
        })}
      </div>
      {label && <span className="cm-progress-label">{label}</span>}
    </div>
  );
}
