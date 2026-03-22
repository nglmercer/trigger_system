import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      sidebar: {
        components: "Components",
        dragCanvas: "Drag onto canvas",
        nodes: {
          eventTrigger: "Event Trigger",
          startsRule: "Starts the rule",
          conditionGroup: "Condition Group",
          logicalGroup: "AND / OR logical group",
          condition: "Condition",
          filterFieldValue: "Filter by field value",
          do: "DO",
          explicitThenPath: "Explicit then path",
          actionGroup: "Action Group",
          groupActions: "Group of actions",
          action: "Action",
          executeHandler: "Execute a handler"
        },
        dataContext: "Data Context",
        config: "Config",
        loadExternalJson: "Load external JSON definitions to enable autocompletion and hover previews.",
        export: "Export",
        import: "Import",
        resetCanvas: "Reset Canvas"
      },
      exchangeModals: {
        importTitle: "Import Rule Project",
        jsonTitle: "JSON Project",
        jsonDesc: "Load a saved workspace draft (.json) to continue editing.",
        yamlTitle: "YAML Rule",
        yamlDesc: "Convert an existing .yaml rule file back into a graph.",
        hostTitle: "Host Application",
        hostImportDesc: "Request rule data from the parent application environment.",
        exportTitle: "Export Project Data",
        downloadYaml: "Download YAML",
        downloadYamlDesc: "Final production rule configuration bundle.",
        saveJson: "Save JSON Workspace",
        saveJsonDesc: "Full graph state for re-importing later.",
        sendHost: "Send to Host",
        sendHostDesc: "Sync current rule directly back to the parent application.",
        shareLink: "Share Link",
        shareLinkDesc: "Copy a unique URL to share this project with others."
      },
      outputPanel: {
        output: "Output",
        yaml: "YAML",
        json: "JSON",
        copy: "Copy",
        copied: "✓ Copied",
        hide: "Hide",
        graphIssues: "⚠️ Graph Issues",
        showYaml: "Show YAML Output"
      },
      paramsModal: {
        editParams: "Edit Parameters",
        builderView: "Builder View",
        jsonView: "JSON / Tree View",
        paramName: "Parameter Name",
        type: "Type",
        valueVariable: "Value / Variable",
        remove: "Remove",
        noParams: "No parameters defined yet. Start by adding one.",
        addParam: "+ Add New Parameter",
        cancel: "Cancel",
        save: "Save Changes",
        types: {
          string: "Text",
          number: "Number",
          boolean: "Bool",
          array: "Array",
          object: "Object"
        }
      },
      nodeDetails: {
        deleteNode: "Delete node",
        fieldTooltip: "Click to learn more about this field",
        eventTriggerTitle: "Event Trigger",
        ruleId: "Rule ID (required)",
        ruleIdPlaceholder: "e.g. payout-rule-1",
        displayName: "Display Name (required)",
        displayNamePlaceholder: "My Amazing Rule",
        eventName: "Event Name (required)",
        eventNamePlaceholder: "e.g. PAYMENT_RECEIVED",
        advancedSettings: "Advanced Settings",
        description: "Description",
        descriptionPlaceholder: "What does this rule do?",
        priority: "Priority",
        enabled: "Enabled",
        cooldown: "Cooldown (ms)",
        tags: "Tags (comma separated)",
        tagsPlaceholder: "tag1, tag2",
        conditionGroupTitle: "Condition Group",
        conditionTitle: "Condition",
        field: "Field",
        fieldPlaceholder: "data.amount",
        operator: "Operator",
        operatorHint: "Select comparison operator",
        value: "Value",
        doTitle: "DO",
        elseTitle: "ELSE",
        branchType: "Branch Type",
        actionGroupTitle: "Action Group",
        executionMode: "Execution Mode",
        actionTitle: "Action",
        actionType: "Action Type",
        actionTypePlaceholder: "log_event",
        params: "Params"
      }
    }
  },
  es: {
    translation: {
      sidebar: {
        components: "Componentes",
        dragCanvas: "Arrastre al lienzo",
        nodes: {
          eventTrigger: "Evento (Trigger)",
          startsRule: "Inicia la regla",
          conditionGroup: "Grupo de Condiciones",
          logicalGroup: "Grupo lógico AND / OR",
          condition: "Condición",
          filterFieldValue: "Filtrar por valor de campo",
          do: "DO (Hacer)",
          explicitThenPath: "Ruta explícita 'entonces'",
          actionGroup: "Grupo de Acciones",
          groupActions: "Grupo de acciones",
          action: "Acción",
          executeHandler: "Ejecutar un controlador"
        },
        dataContext: "Contexto de Datos",
        config: "Configuración",
        loadExternalJson: "Cargue definiciones JSON externas para habilitar el autocompletado y vistas previas.",
        export: "Exportar",
        import: "Importar",
        resetCanvas: "Limpiar Lienzo"
      },
      exchangeModals: {
        importTitle: "Importar Proyecto de Regla",
        jsonTitle: "Proyecto JSON",
        jsonDesc: "Cargar un borrador guardado (.json) para continuar editando.",
        yamlTitle: "Regla YAML",
        yamlDesc: "Convertir un archivo YAML existente de vuelta a un grafo.",
        hostTitle: "Aplicación Principal",
        hostImportDesc: "Solicitar datos de la regla del entorno de la aplicación principal.",
        exportTitle: "Exportar Datos del Proyecto",
        downloadYaml: "Descargar YAML",
        downloadYamlDesc: "Configuración final del paquete de reglas para producción.",
        saveJson: "Guardar Espacio JSON",
        saveJsonDesc: "Estado completo del grafo para reimportar más tarde.",
        sendHost: "Enviar al Principal",
        sendHostDesc: "Sincronizar regla directamente a la aplicación padre.",
        shareLink: "Enlace para Compartir",
        shareLinkDesc: "Copie un enlace único para compartir este proyecto."
      },
      outputPanel: {
        output: "Salida",
        yaml: "YAML",
        json: "JSON",
        copy: "Copiar",
        copied: "✓ Copiado",
        hide: "Ocultar",
        graphIssues: "⚠️ Problemas en el Grafo",
        showYaml: "Mostrar Salida YAML"
      },
      paramsModal: {
        editParams: "Editar Parámetros",
        builderView: "Vista Constructor",
        jsonView: "Vista JSON / Árbol",
        paramName: "Nombre del Parámetro",
        type: "Tipo",
        valueVariable: "Valor / Variable",
        remove: "Eliminar",
        noParams: "No hay parámetros definidos aún. Empieza agregando uno.",
        addParam: "+ Añadir Nuevo Parámetro",
        cancel: "Cancelar",
        save: "Guardar Cambios",
        types: {
          string: "Texto",
          number: "Número",
          boolean: "Booleano",
          array: "Lista",
          object: "Objeto"
        }
      },
      nodeDetails: {
        deleteNode: "Eliminar nodo",
        fieldTooltip: "Haz clic para saber más sobre este campo",
        eventTriggerTitle: "Evento",
        ruleId: "ID de Regla (requerido)",
        ruleIdPlaceholder: "ej. regla-pago-1",
        displayName: "Nombre Visible (requerido)",
        displayNamePlaceholder: "Mi Regla Increíble",
        eventName: "Nombre del Evento (requerido)",
        eventNamePlaceholder: "ej. PAGO_RECIBIDO",
        advancedSettings: "Ajustes Avanzados",
        description: "Descripción",
        descriptionPlaceholder: "¿Qué hace esta regla?",
        priority: "Prioridad",
        enabled: "Habilitado",
        cooldown: "Enfriamiento (ms)",
        tags: "Etiquetas (separadas por comas)",
        tagsPlaceholder: "etiqueta1, etiqueta2",
        conditionGroupTitle: "Grupo de Condiciones",
        conditionTitle: "Condición",
        field: "Campo",
        fieldPlaceholder: "datos.cantidad",
        operator: "Operador",
        operatorHint: "Seleccione el operador de comparación",
        value: "Valor",
        doTitle: "HACER (DO)",
        elseTitle: "SINO (ELSE)",
        branchType: "Tipo de Rama",
        actionGroupTitle: "Grupo de Acciones",
        executionMode: "Modo de Ejecución",
        actionTitle: "Acción",
        actionType: "Tipo de Acción",
        actionTypePlaceholder: "log_event",
        params: "Parámetros"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", 
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
