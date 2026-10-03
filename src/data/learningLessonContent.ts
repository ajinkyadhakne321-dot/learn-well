import forLoopAudioUrl from '../../speech.mp3?url'

export type LessonBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'code'; label: string; code: string }
  | { type: 'list'; items: string[] }

export type LearningLessonSection = {
  id: string
  title: string
  blocks: LessonBlock[]
  audioUrl?: string
}

export type LearningLesson = {
  materialId: string
  title: string
  subject: string
  introduction: string
  sections: LearningLessonSection[]
}

export const learningLessons: Record<string, LearningLesson> = {
  'material-1': {
    materialId: 'material-1',
    title: 'loops',
    subject: 'python',
    introduction: 'Loops repeat a block of code. Python for loops process items in a sequence, while loops repeat as long as a condition remains true.',
    sections: [
      {
        id: 'for-loop',
        title: '1. The for loop',
        audioUrl: forLoopAudioUrl,
        blocks: [
          { type: 'paragraph', text: 'Use a for loop to run the same instructions once for each item in an iterable, such as a string, list, or dictionary.' },
          { type: 'code', label: 'Looping through a string', code: 'for char in "Python":\n    print(char)' },
          { type: 'code', label: 'Looping through a list', code: 'fruits = ["apple", "banana", "cherry"]\nfor fruit in fruits:\n    print(fruit)' },
          { type: 'code', label: 'Looping through a dictionary', code: 'user = {"name": "Alice", "role": "Admin"}\nfor key, value in user.items():\n    print(f"{key}: {value}")' },
        ],
      },
      {
        id: 'while-loop',
        title: '2. The while loop',
        blocks: [
          { type: 'paragraph', text: 'Use a while loop when you want to repeat code as long as a specific Boolean condition remains true. Update the condition inside the loop, for example by incrementing a counter, or the loop may run forever.' },
          { type: 'code', label: 'Count from one to three', code: 'count = 1\nwhile count <= 3:\n    print(f"Iteration {count}")\n    count += 1  # Update the condition' },
        ],
      },
      {
        id: 'loop-control',
        title: '3. Loop control statements',
        blocks: [
          { type: 'paragraph', text: 'Use these keywords to change what happens during a loop:' },
          { type: 'list', items: [
            'break exits the loop immediately.',
            'continue skips the rest of the current iteration and moves to the next one.',
            'pass does nothing; it is a placeholder when Python requires a statement but you are not ready to add behavior.',
          ] },
          { type: 'code', label: 'Stop a loop with break', code: 'for num in range(1, 10):\n    if num == 5:\n        break  # Exit the loop when num reaches 5\n    print(num)  # Prints 1, 2, 3, 4' },
          { type: 'code', label: 'Skip an iteration with continue', code: 'for num in range(1, 6):\n    if num == 3:\n        continue  # Skip the rest of this iteration\n    print(num)  # Prints 1, 2, 4, 5' },
          { type: 'code', label: 'Leave a placeholder with pass', code: 'for item in ["apple", "banana"]:\n    pass  # Add the loop behavior later' },
        ],
      },
      {
        id: 'loop-else',
        title: '4. The else clause in loops',
        blocks: [
          { type: 'paragraph', text: 'A loop can have an optional else block. It runs when the loop finishes normally, but not when the loop exits with break.' },
          { type: 'code', label: 'Else runs after normal completion', code: 'for item in [1, 2, 3]:\n    print(item)\nelse:\n    print("Loop finished smoothly!")' },
          { type: 'code', label: 'Else does not run after break', code: 'for item in [1, 2, 3]:\n    if item == 2:\n        break\n    print(item)\nelse:\n    print("This does not run")' },
        ],
      },
      {
        id: 'nested-loops',
        title: '5. Nested loops',
        blocks: [
          { type: 'paragraph', text: 'A nested loop is a loop inside another loop. The inner loop completes all of its iterations for each single iteration of the outer loop.' },
          { type: 'code', label: 'An outer loop and an inner loop', code: 'for i in range(1, 3):  # Outer loop\n    for j in range(1, 3):  # Inner loop\n        print(f"i={i}, j={j}")' },
        ],
      },
      {
        id: 'loop-utilities',
        title: '6. Handy looping utilities',
        blocks: [
          { type: 'list', items: [
            'enumerate() gives you an item and its index together.',
            'zip() lets you loop through two or more sequences side by side.',
          ] },
          { type: 'code', label: 'Use enumerate to get each index and name', code: 'names = ["Alice", "Bob"]\nfor index, name in enumerate(names):\n    print(f"{index}: {name}")  # 0: Alice, 1: Bob' },
          { type: 'code', label: 'Use zip to process related lists together', code: 'items = ["Product A", "Product B"]\nprices = [10, 20]\nfor item, price in zip(items, prices):\n    print(f"{item} costs ${price}")' },
        ],
      },
    ],
  },
}
