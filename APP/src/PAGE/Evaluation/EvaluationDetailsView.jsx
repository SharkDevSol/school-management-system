import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import EvaluationList from './EvaluationList'; // Assuming EvaluationList is in the same folder
import CreateEvaluation from './CreateEvaluation'; // Assuming CreateEvaluation is in the same folder
import styles from './EvaluationDetailsView.module.css';
import { FiArrowLeft } from 'react-icons/fi';

const EvaluationDetailsView = () => {
  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(null);
  const navigate = useNavigate();

  const handleCreateNew = () => {
    setSelectedEvaluationId(null);
    setView('create');
  };

  const handleEditEvaluation = (id) => {
    setSelectedEvaluationId(id);
    setView('create'); // Reuse the create/edit form
  };

  const handleViewEvaluation = (id) => {
    // This function is for viewing the details/summary, not the fillable form
    // You might navigate to a different details page or show a modal
    console.log(`Viewing details for evaluation: ${id}`);
    // Example: navigate(`/evaluation-summary/${id}`);
  };

  // --- SOLUTION: Add this function ---
  const handleOpenForm = (id) => {
    // This function handles opening the fillable form for data entry
    console.log(`Opening form for evaluation: ${id}`);
    navigate(`/evaluation-form/${id}`);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedEvaluationId(null);
  };

  const handleEvaluationCreated = (newEvaluation) => {
    // After creating/editing, go back to the list
    console.log('Evaluation created/updated:', newEvaluation);
    setView('list');
  };

  const renderContent = () => {
    switch (view) {
      case 'create':
        return (
          <div>
            <button onClick={handleBackToList} className={styles.backButton}>
              <FiArrowLeft /> Back to List
            </button>
            <CreateEvaluation
              evaluationId={selectedEvaluationId}
              onEvaluationCreated={handleEvaluationCreated}
              onCancel={handleBackToList}
            />
          </div>
        );
      case 'list':
      default:
        return (
          <EvaluationList
            onCreateNew={handleCreateNew}
            onViewEvaluation={handleViewEvaluation}
            onEditEvaluation={handleEditEvaluation}
            onOpenForm={handleOpenForm} // <-- And pass it here
          />
        );
    }
  };

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default EvaluationDetailsView;
