// src/lib/avatar.ts
import CryptoJS from 'crypto-js'

const animals = ['Panda', 'Fox', 'Cat', 'Tiger', 'Koala', 'Sloth', 'Penguin', 'Raccoon', 'Otter', 'Wolf']
const moods = ['Sad', 'Sassy', 'Chaotic', 'Sleepy', 'Angry', 'Crying', 'Evil', 'Drunk', 'High', 'Horny']

export function getAvatar(hash: string) {
  const num = parseInt(CryptoJS.SHA256(hash).toString().substr(0, 8), 16)
  const animal = animals[num % animals.length]
  const mood = moods[Math.floor(num / 100000000) % moods.length]
  return `${mood} ${animal}`
}