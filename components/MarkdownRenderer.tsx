import React from 'react';

interface MarkdownRendererProps {
  text: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  const renderLine = (line: string, index: number) => {
    // Regex to find **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(line)) !== null) {
      // Push the text before the bold part
      if (match.index > lastIndex) {
        parts.push(<span key={`${index}-pre-${lastIndex}`}>{line.substring(lastIndex, match.index)}</span>);
      }
      // Push the bold part
      parts.push(<strong key={`${index}-bold-${match.index}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    // Push any remaining text after the last bold part
    if (lastIndex < line.length) {
      parts.push(<span key={`${index}-post-${lastIndex}`}>{line.substring(lastIndex)}</span>);
    }
    
    return <>{parts}</>;
  };

  const blocks = text.split('\n\n');

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n');
        const isList = lines.every(line => line.trim().startsWith('- ') || line.trim().startsWith('* '));

        if (isList) {
          return (
            <ul key={blockIndex} className="list-disc pl-5 space-y-1 my-2">
              {lines.map((item, itemIndex) => (
                <li key={itemIndex}>
                  {renderLine(item.trim().substring(2), itemIndex)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex} className="my-2">
            {lines.map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>
                {renderLine(line, lineIndex)}
                {lineIndex < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;