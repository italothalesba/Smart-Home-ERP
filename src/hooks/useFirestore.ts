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

  const getPath = () => {
    if (collectionName.startsWith('/')) {
      return collectionName.substring(1);
    }
    const userId = auth.currentUser?.uid;
    return userId ? `users/${userId}/${collectionName}` : null;
  };

  useEffect(() => {
    const path = getPath();
    if (!path) return;

    const q = query(collection(db, path));
    
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
    const path = getPath();
    const userId = auth.currentUser?.uid;
    if (!path) return null;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...item,
        updatedAt: serverTimestamp(),
        ...(collectionName.startsWith('/') ? { contributorId: userId } : { ownerId: userId })
      });
      return docRef;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, collectionName);
      return null;
    }
  };

  const update = async (id: string, item: Partial<T>) => {
    const path = getPath();
    const userId = auth.currentUser?.uid;
    if (!path) return;
    try {
      await updateDoc(doc(db, path, id), {
        ...item,
        updatedAt: serverTimestamp(),
        ...(collectionName.startsWith('/') ? { lastUpdateBy: userId } : { ownerId: userId })
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, collectionName);
    }
  };

  const remove = async (id: string) => {
    const path = getPath();
    if (!path) return;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, collectionName);
    }
  };

  return { data, loading, add, update, remove };
}
