import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Product, Finance, Meal, FinanceType, FinanceStatus } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { OperationType } from '../types';

export function useFirestore<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(collection(db, `users/${userId}/${collectionName}`));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      setData(items);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, collectionName);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const add = async (item: any) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;
    try {
      const docRef = await addDoc(collection(db, `users/${userId}/${collectionName}`), {
        ...item,
        updatedAt: serverTimestamp(),
        ownerId: userId
      });
      return docRef;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, collectionName);
      return null;
    }
  };

  const update = async (id: string, item: Partial<T>) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    try {
      await updateDoc(doc(db, `users/${userId}/${collectionName}`, id), {
        ...item,
        updatedAt: serverTimestamp(),
        ownerId: userId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, collectionName);
    }
  };

  const remove = async (id: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/${collectionName}`, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, collectionName);
    }
  };

  return { data, loading, add, update, remove };
}
